import * as THREE from 'three';
import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type CustomRenderMethodInput,
  type Map as LibreMap,
} from 'maplibre-gl';
import type { Bridge3DConfig } from '../types';
import { DRAGON_BRIDGE_CONFIG } from '../data/bridgeConfig';
import { DragonBridgeBuilder } from './DragonBridgeBuilder';

interface LayerEvents {
  onFirstRender?: () => void;
  onError?: () => void;
}

/** Local coordinates are metres, X along the bridge, Y across it, Z up.
 * Fold the georeference into the projection on the CPU to retain precision at city scale.
 * The renderer shares MapLibre's context; it never owns or clears that context.
 */
export class MapLibre3DBridgeLayer implements CustomLayerInterface {
  readonly type = 'custom' as const;
  readonly renderingMode = '3d' as const;
  private camera = new THREE.Camera();
  private scene = new THREE.Scene();
  private renderer: THREE.WebGLRenderer | null = null;
  private builder: DragonBridgeBuilder | null = null;
  private modelMatrix = new THREE.Matrix4();
  private rendered = false;
  private failed = false;

  constructor(
    private config: Bridge3DConfig = DRAGON_BRIDGE_CONFIG,
    readonly id = 'cau-rong-3d-layer',
    private events: LayerEvents = {},
  ) {}

  onAdd(map: LibreMap, gl: WebGL2RenderingContext): void {
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const sun = new THREE.DirectionalLight(0xfff4d7, 2.5);
    sun.position.set(100, -150, 240);
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0xdcefff, 1.2);
    fill.position.set(-100, 100, 80);
    this.scene.add(fill);
    this.builder = new DragonBridgeBuilder(this.config);
    this.scene.add(this.builder.build());
    const { anchor, bearing } = this.config;
    const coordinate = MercatorCoordinate.fromLngLat(
      [anchor.longitude, anchor.latitude],
      anchor.altitude ?? 0,
    );
    const metres = coordinate.meterInMercatorCoordinateUnits();
    this.modelMatrix
      .makeTranslation(coordinate.x, coordinate.y, coordinate.z)
      .multiply(
        new THREE.Matrix4().makeRotationZ(((bearing - 90) * Math.PI) / 180),
      )
      .multiply(new THREE.Matrix4().makeScale(metres, -metres, metres));
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true,
    });
    this.renderer.autoClear = false;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  render(gl: WebGL2RenderingContext, input: CustomRenderMethodInput): void {
    if (!this.renderer || this.failed) return;
    try {
      this.camera.projectionMatrix
        .fromArray(input.defaultProjectionData.mainMatrix)
        .multiply(this.modelMatrix);
      this.camera.projectionMatrixInverse
        .copy(this.camera.projectionMatrix)
        .invert();
      // MapLibre 6 may draw into an intermediate framebuffer. Three's resetState
      // unbinds it, so restore the supplied target before drawing into the map.
      const framebuffer = gl.getParameter(
        gl.FRAMEBUFFER_BINDING,
      ) as WebGLFramebuffer | null;
      this.renderer.resetState();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      // The base style is a flat raster. Give the model its own depth pass so
      // MapLibre's packed raster depth range cannot clip arches or pier faces.
      this.renderer.clearDepth();
      this.renderer.render(this.scene, this.camera);
      if (!this.rendered && this.renderer.info.render.triangles > 0) {
        this.rendered = true;
        this.events.onFirstRender?.();
      }
    } catch {
      this.failed = true;
      this.events.onError?.();
    }
  }

  onRemove(): void {
    const geometries = new Set<THREE.BufferGeometry>();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) geometries.add(object.geometry);
    });
    geometries.forEach((geometry) => geometry.dispose());
    this.builder?.dispose();
    this.builder = null;
    this.renderer?.dispose();
    this.renderer = null;
    this.scene.clear();
  }
}
