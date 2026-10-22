import * as THREE from 'three';
import type { Bridge3DConfig } from '../types';

/**
 * DragonBridgeBuilder
 * Tách biệt hoàn toàn logic dựng hình 3D procedural của Cầu Rồng khỏi React component.
 *
 * Các bộ phận hình học thực sự:
 * 1. Mặt cầu (Road Deck): chiều dài 660m, bề rộng 37.5m, dầm hộp, vạch kẻ đường và lề bộ hành.
 * 2. Trụ cầu (River Piers): 5 trụ bê tông cốt thép thân thuôn khí động học đỡ các nhịp vòm.
 * 3. Thân rồng (Dragon Spine): 5 nhịp vòm thép ống vàng uốn lượn liên tục, nhịp chính cao 34m,
 *    kèm hệ thanh treo (hangers) và vây lưng hình tam giác thời Lý.
 * 4. Đầu rồng (Dragon Head): khối đầu đặc trưng thời Lý hướng về phía Đông (Biển Đông),
 *    mõm rộng, bờm rồng uốn lượn ra sau, râu rồng và hốc mắt.
 * 5. Đuôi rồng (Dragon Tail): đuôi xòe hình búp sen / ngọn lửa uốn cong mềm mại neo vào bờ Tây.
 */
export class DragonBridgeBuilder {
  private config: Bridge3DConfig;
  private materials: Map<string, THREE.Material> = new Map();

  constructor(config: Bridge3DConfig) {
    this.config = config;
    this.initMaterials();
  }

  private initMaterials() {
    // Vàng hoàng gia / Kim loại ánh vàng của thân và đầu rồng
    this.materials.set(
      'dragonGold',
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.45,
        roughness: 0.28,
      }),
    );

    // Điểm nhấn viền vàng sậm / cam hổ phách
    this.materials.set(
      'dragonGoldDark',
      new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.4,
        roughness: 0.35,
      }),
    );

    // Vàng sáng cho vây lưng và bờm rồng
    this.materials.set(
      'dragonGoldBright',
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        metalness: 0.35,
        roughness: 0.25,
      }),
    );

    // Bê tông trụ cầu xám sáng chống rêu phong sông Hàn
    this.materials.set(
      'concrete',
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.05,
        roughness: 0.85,
      }),
    );

    // Mặt đường nhựa asphalt đen nhám
    this.materials.set(
      'asphalt',
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.05,
        roughness: 0.9,
      }),
    );

    // Vạch kẻ đường vàng
    this.materials.set(
      'roadMarking',
      new THREE.MeshBasicMaterial({
        color: 0xfde047,
      }),
    );

    // Vỉa hè đá hoa cương xám nhạt
    this.materials.set(
      'sidewalk',
      new THREE.MeshStandardMaterial({
        color: 0xcfd8dc,
        metalness: 0.1,
        roughness: 0.75,
      }),
    );

    // Dây cáp treo thép chịu lực mạ kẽm
    this.materials.set(
      'cables',
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        metalness: 0.65,
        roughness: 0.3,
      }),
    );

    // Lan can màu xanh ngọc biển Đà Nẵng
    this.materials.set(
      'railing',
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        metalness: 0.3,
        roughness: 0.4,
      }),
    );

    // Mắt rồng đá quý đen / hổ phách
    this.materials.set(
      'dragonEye',
      new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.8,
        roughness: 0.1,
      }),
    );
  }

  public build(): THREE.Group {
    const root = new THREE.Group();
    root.name = 'DanangDragonBridge3D';

    // 1. Mặt cầu và hệ dầm giao thông
    root.add(this.buildDeck());

    // 2. Hệ trụ cầu dưới nước và mố cầu hai đầu
    root.add(this.buildPiersAndAbutments());

    // 3. Thân rồng uốn 5 nhịp vòm thép và dây treo
    root.add(this.buildDragonBody());

    // 4. Đầu rồng thời Lý hướng biển Đông
    root.add(this.buildDragonHead());

    // 5. Đuôi rồng hoa sen ở bờ Tây
    root.add(this.buildDragonTail());

    return root;
  }

  /**
   * 1. Mặt cầu (Road Deck): dầm hộp, 6 làn xe, 2 lề bộ hành và lan can
   */
  private buildDeck(): THREE.Group {
    const deckGroup = new THREE.Group();
    deckGroup.name = 'BridgeDeck';

    const {
      totalLengthMeters: len,
      deckWidthMeters: width,
      deckElevationMeters: elev,
    } = this.config;
    const slabThickness = 2.2;
    const deckCenterZ = elev - slabThickness / 2;

    // Dầm mặt cầu chính (Box girder)
    const slabGeo = new THREE.BoxGeometry(len, width, slabThickness);
    const slabMesh = new THREE.Mesh(slabGeo, this.materials.get('asphalt'));
    slabMesh.position.set(0, 0, deckCenterZ);
    deckGroup.add(slabMesh);

    // Hai dải vỉa hè bộ hành nâng cao 0.35m
    const sidewalkWidth = 4.2;
    const sidewalkThickness = 0.35;
    const sidewalkGeo = new THREE.BoxGeometry(
      len,
      sidewalkWidth,
      sidewalkThickness,
    );
    const sidewalkMat = this.materials.get('sidewalk');

    // Vỉa hè phía Bắc (+Y)
    const northWalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    northWalk.position.set(
      0,
      (width - sidewalkWidth) / 2,
      elev + sidewalkThickness / 2,
    );
    deckGroup.add(northWalk);

    // Vỉa hè phía Nam (-Y)
    const southWalk = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    southWalk.position.set(
      0,
      -(width - sidewalkWidth) / 2,
      elev + sidewalkThickness / 2,
    );
    deckGroup.add(southWalk);

    // Vạch kẻ tim đường kép vàng
    const laneMarkGeo = new THREE.BoxGeometry(len * 0.98, 0.3, 0.04);
    const laneMarkMat = this.materials.get('roadMarking');
    const laneMark1 = new THREE.Mesh(laneMarkGeo, laneMarkMat);
    laneMark1.position.set(0, 0.25, elev + 0.02);
    deckGroup.add(laneMark1);

    const laneMark2 = new THREE.Mesh(laneMarkGeo, laneMarkMat);
    laneMark2.position.set(0, -0.25, elev + 0.02);
    deckGroup.add(laneMark2);

    // Lan can bảo vệ hai bên mép cầu
    const railHeight = 1.2;
    const railGeo = new THREE.BoxGeometry(len, 0.2, railHeight);
    const railMat = this.materials.get('railing');

    const northRail = new THREE.Mesh(railGeo, railMat);
    northRail.position.set(
      0,
      width / 2 - 0.1,
      elev + sidewalkThickness + railHeight / 2,
    );
    deckGroup.add(northRail);

    const southRail = new THREE.Mesh(railGeo, railMat);
    southRail.position.set(
      0,
      -width / 2 + 0.1,
      elev + sidewalkThickness + railHeight / 2,
    );
    deckGroup.add(southRail);

    return deckGroup;
  }

  /**
   * 2. Hệ trụ cầu dưới nước (Piers) và mố cầu (Abutments)
   */
  private buildPiersAndAbutments(): THREE.Group {
    const piersGroup = new THREE.Group();
    piersGroup.name = 'BridgePiers';

    const {
      deckElevationMeters: elev,
      totalLengthMeters: len,
      deckWidthMeters: width,
    } = this.config;
    const pierMat = this.materials.get('concrete');

    // 5 vị trí trụ chính đỡ 5 nhịp vòm
    const pierXPositions = [-230, -90, 45, 175, 260];
    const pierHeight = elev;

    pierXPositions.forEach((x, idx) => {
      // Trụ hình elip / bo tròn thân đôi chịu lực
      const pierPillarGeo = new THREE.CylinderGeometry(
        2.4,
        3.2,
        pierHeight,
        16,
      );
      pierPillarGeo.rotateX(Math.PI / 2); // Three cylinders are Y-up; the model is Z-up.
      pierPillarGeo.scale(1.8, 3.5, 1);

      const pierMesh = new THREE.Mesh(pierPillarGeo, pierMat);
      pierMesh.position.set(x, 0, pierHeight / 2);
      pierMesh.name = `Pier_${idx + 1}`;
      piersGroup.add(pierMesh);

      // Bệ móng cọc nổi trên mặt nước (Pile cap footing)
      const capGeo = new THREE.BoxGeometry(10, width * 0.9, 1.8);
      const capMesh = new THREE.Mesh(capGeo, pierMat);
      capMesh.position.set(x, 0, 0.9);
      piersGroup.add(capMesh);
    });

    // Mố cầu bờ Tây (Hải Châu - X = -len/2)
    const abutmentGeo = new THREE.BoxGeometry(25, width * 1.1, elev);
    const westAbutment = new THREE.Mesh(abutmentGeo, pierMat);
    westAbutment.position.set(-len / 2 + 10, 0, elev / 2);
    westAbutment.name = 'WestAbutment_HaiChau';
    piersGroup.add(westAbutment);

    // Mố cầu bờ Đông (Sơn Trà - X = +len/2)
    const eastAbutment = new THREE.Mesh(abutmentGeo, pierMat);
    eastAbutment.position.set(len / 2 - 10, 0, elev / 2);
    eastAbutment.name = 'EastAbutment_SonTra';
    piersGroup.add(eastAbutment);

    return piersGroup;
  }

  /**
   * 3. Thân rồng vàng 5 nhịp vòm thép và hệ cáp treo
   */
  private buildDragonBody(): THREE.Group {
    const bodyGroup = new THREE.Group();
    bodyGroup.name = 'DragonBody';

    const { deckElevationMeters: elev, dragonMaxHeightMeters: maxH } =
      this.config;
    const goldMat = this.materials.get('dragonGold');
    const goldDarkMat = this.materials.get('dragonGoldDark');
    const goldBrightMat = this.materials.get('dragonGoldBright');
    const cableMat = this.materials.get('cables');

    // Đường cong sống lưng rồng (CatmullRom spline) qua 5 nhịp uốn lượn
    const spinePoints: THREE.Vector3[] = [
      new THREE.Vector3(-315, 0, elev + 0.8), // Gốc đuôi
      new THREE.Vector3(-285, 0, elev + 8.5), // Đỉnh nhịp 1
      new THREE.Vector3(-230, 0, elev + 1.2), // Đáy nhịp 1
      new THREE.Vector3(-165, 0, elev + 15.0), // Đỉnh nhịp 2
      new THREE.Vector3(-90, 0, elev + 1.5), // Đáy nhịp 2
      new THREE.Vector3(45, 0, maxH), // Đỉnh nhịp chính (34m)
      new THREE.Vector3(140, 0, elev + 1.5), // Đáy nhịp chính
      new THREE.Vector3(195, 0, elev + 13.5), // Đỉnh nhịp 4
      new THREE.Vector3(245, 0, elev + 1.8), // Đáy nhịp 4
      new THREE.Vector3(280, 0, elev + 10.0), // Cổ rồng vươn lên
      new THREE.Vector3(305, 0, elev + 18.0), // Khớp nối đầu
    ];

    const spineCurve = new THREE.CatmullRomCurve3(spinePoints);

    // Ống vòm sống lưng chính (Main Spine Tube)
    const spineGeo = new THREE.TubeGeometry(spineCurve, 180, 1.65, 16, false);
    const spineMesh = new THREE.Mesh(spineGeo, goldMat);
    spineMesh.name = 'DragonSpineMain';
    bodyGroup.add(spineMesh);

    // Hai ống vòm thép phụ chạy song song hai bên sườn tạo kết cấu vòm 3 ống
    const leftCurvePoints = spinePoints.map(
      (p) => new THREE.Vector3(p.x, 2.0, p.z - 0.7),
    );
    const leftCurve = new THREE.CatmullRomCurve3(leftCurvePoints);
    const leftTube = new THREE.Mesh(
      new THREE.TubeGeometry(leftCurve, 140, 0.95, 12, false),
      goldDarkMat,
    );
    leftTube.name = 'DragonTrussLeft';
    bodyGroup.add(leftTube);

    const rightCurvePoints = spinePoints.map(
      (p) => new THREE.Vector3(p.x, -2.0, p.z - 0.7),
    );
    const rightCurve = new THREE.CatmullRomCurve3(rightCurvePoints);
    const rightTube = new THREE.Mesh(
      new THREE.TubeGeometry(rightCurve, 140, 0.95, 12, false),
      goldDarkMat,
    );
    rightTube.name = 'DragonTrussRight';
    bodyGroup.add(rightTube);

    // Hệ thanh treo thép (Hanger Cables) nối từ vòm rồng xuống mặt cầu
    const hangerCount = 52;
    for (let i = 1; i < hangerCount; i++) {
      const t = i / hangerCount;
      const point = spineCurve.getPoint(t);

      // Chỉ tạo dây treo khi vòm nhô cao hơn mặt cầu tối thiểu 2.5m
      const heightAboveDeck = point.z - (elev + 0.5);
      if (heightAboveDeck > 2.5 && point.x < 290) {
        const cableGeo = new THREE.CylinderGeometry(
          0.09,
          0.09,
          heightAboveDeck,
          8,
        );
        cableGeo.rotateX(Math.PI / 2);
        const cableMesh = new THREE.Mesh(cableGeo, cableMat);
        cableMesh.position.set(
          point.x,
          point.y,
          elev + 0.5 + heightAboveDeck / 2,
        );
        bodyGroup.add(cableMesh);
      }
    }

    // Vây lưng rồng thời Lý (Dorsal Scales): hình tam giác cách điệu gắn dọc sống lưng
    const scaleCount = 42;
    const scaleShape = new THREE.Shape();
    scaleShape.moveTo(0, 0);
    scaleShape.lineTo(1.8, 2.6);
    scaleShape.lineTo(-1.8, 2.6);
    scaleShape.closePath();

    const scaleGeo = new THREE.ExtrudeGeometry(scaleShape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.1,
      bevelThickness: 0.1,
    });
    scaleGeo.center();

    for (let i = 2; i < scaleCount; i++) {
      const t = i / scaleCount;
      const pt = spineCurve.getPoint(t);
      const tangent = spineCurve.getTangent(t);

      if (pt.z > elev + 3.0 && pt.x < 300) {
        const scaleMesh = new THREE.Mesh(scaleGeo, goldBrightMat);
        scaleMesh.position.set(pt.x, 0, pt.z + 1.4);
        scaleMesh.rotation.y = -Math.atan2(tangent.z, tangent.x);
        scaleMesh.rotation.x = Math.PI / 2;
        bodyGroup.add(scaleMesh);
      }
    }

    return bodyGroup;
  }

  /**
   * 4. Đầu rồng thời Lý (Dragon Head): hướng về phía Đông (Sơn Trà / Biển Đông)
   * Vị trí: X ~ 305 - 340m, Z ~ 22 - 32m
   */
  private buildDragonHead(): THREE.Group {
    const headGroup = new THREE.Group();
    headGroup.name = 'DragonHead_LyDynasty';

    const goldMat = this.materials.get('dragonGold');
    const goldDarkMat = this.materials.get('dragonGoldDark');
    const goldBrightMat = this.materials.get('dragonGoldBright');
    const eyeMat = this.materials.get('dragonEye');

    // Khối sọ chính của đầu rồng (Cranium)
    const craniumGeo = new THREE.BoxGeometry(14, 7.5, 6.5);
    const craniumMesh = new THREE.Mesh(craniumGeo, goldMat);
    craniumMesh.position.set(318, 0, 26.5);
    headGroup.add(craniumMesh);

    // Mõm rồng trên vươn dài ra phía trước (Upper Snout)
    const snoutGeo = new THREE.ConeGeometry(4.2, 12, 6);
    snoutGeo.rotateZ(-Math.PI / 2);
    const snoutMesh = new THREE.Mesh(snoutGeo, goldMat);
    snoutMesh.position.set(330, 0, 26.8);
    headGroup.add(snoutMesh);

    // Ống phun lửa/nước biểu tượng tại đỉnh mõm (Fire/Water Nozzle)
    const nozzleGeo = new THREE.CylinderGeometry(1.2, 1.4, 3.5, 12);
    nozzleGeo.rotateZ(Math.PI / 2);
    const nozzleMesh = new THREE.Mesh(nozzleGeo, goldDarkMat);
    nozzleMesh.position.set(337, 0, 27.2);
    headGroup.add(nozzleMesh);

    // Hàm dưới hé mở (Lower Jaw)
    const lowerJawGeo = new THREE.BoxGeometry(9, 6.0, 2.2);
    const lowerJawMesh = new THREE.Mesh(lowerJawGeo, goldDarkMat);
    lowerJawMesh.position.set(326, 0, 23.5);
    headGroup.add(lowerJawMesh);

    // Mắt rồng hai bên (Dragon Eyes)
    const eyeGeo = new THREE.SphereGeometry(1.3, 16, 16);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(320, 3.9, 28.0);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(320, -3.9, 28.0);
    headGroup.add(rightEye);

    // Mày mắt lồi bảo vệ (Eyebrow Ridges)
    const browGeo = new THREE.TorusGeometry(1.8, 0.45, 8, 16, Math.PI);
    browGeo.rotateX(Math.PI / 2);
    const leftBrow = new THREE.Mesh(browGeo, goldBrightMat);
    leftBrow.position.set(320, 3.7, 29.2);
    headGroup.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, goldBrightMat);
    rightBrow.position.set(320, -3.7, 29.2);
    rightBrow.rotation.y = Math.PI;
    headGroup.add(rightBrow);

    // Bờm rồng / Sừng lửa thời Lý uốn lượn ngược về sau gáy (Back Crests)
    for (let c = 0; c < 5; c++) {
      const crestCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(
          316 - c * 2.5,
          (c % 2 === 0 ? 1 : -1) * 1.5,
          29.5 + c * 0.8,
        ),
        new THREE.Vector3(306 - c * 3, c % 2 === 0 ? 3 : -3, 34.0 + c * 1.2),
        new THREE.Vector3(294 - c * 4, 0, 36.5 + c * 0.5),
      );
      const crestTube = new THREE.Mesh(
        new THREE.TubeGeometry(crestCurve, 20, 0.75 - c * 0.1, 8, false),
        goldBrightMat,
      );
      headGroup.add(crestTube);
    }

    // Râu rồng (Whiskers / Beard) mềm mại lượn dưới cằm
    const leftWhiskerCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(328, 2.5, 24.0),
      new THREE.Vector3(320, 7.5, 20.0),
      new THREE.Vector3(310, 6.0, 16.5),
    );
    const leftWhisker = new THREE.Mesh(
      new THREE.TubeGeometry(leftWhiskerCurve, 24, 0.4, 8, false),
      goldBrightMat,
    );
    headGroup.add(leftWhisker);

    const rightWhiskerCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(328, -2.5, 24.0),
      new THREE.Vector3(320, -7.5, 20.0),
      new THREE.Vector3(310, -6.0, 16.5),
    );
    const rightWhisker = new THREE.Mesh(
      new THREE.TubeGeometry(rightWhiskerCurve, 24, 0.4, 8, false),
      goldBrightMat,
    );
    headGroup.add(rightWhisker);

    return headGroup;
  }

  /**
   * 5. Đuôi rồng xòe hoa sen / ngọn lửa thời Lý (Dragon Tail) ở bờ Tây
   * Vị trí: X ~ -335m đến -310m
   */
  private buildDragonTail(): THREE.Group {
    const tailGroup = new THREE.Group();
    tailGroup.name = 'DragonTail_LotusFan';

    const goldBrightMat = this.materials.get('dragonGoldBright');
    const goldMat = this.materials.get('dragonGold');
    const elev = this.config.deckElevationMeters;

    // 5 cánh xòe hình cánh sen / tia lửa tạo hình dáng đuôi nhận diện của Cầu Rồng
    const petalAngles = [-40, -20, 0, 20, 40];
    const petalLengths = [14, 18, 22, 18, 14];

    petalAngles.forEach((deg, idx) => {
      const len = petalLengths[idx];
      const rad = (deg * Math.PI) / 180;

      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(-315, 0, elev + 0.8),
        new THREE.Vector3(-322, Math.sin(rad) * 4.0, elev + 4.5),
        new THREE.Vector3(-328, Math.sin(rad) * 7.5, elev + len * 0.45),
        new THREE.Vector3(-334, Math.sin(rad) * 9.5, elev + len * 0.75),
      );

      const petalTube = new THREE.Mesh(
        new THREE.TubeGeometry(
          curve,
          20,
          0.95 - Math.abs(deg) * 0.012,
          10,
          false,
        ),
        idx === 2 ? goldBrightMat : goldMat,
      );
      petalTube.name = `TailPetal_${idx + 1}`;
      tailGroup.add(petalTube);
    });

    return tailGroup;
  }

  /**
   * Dọn dẹp bộ nhớ: giải phóng mọi Material được builder quản lý
   */
  public dispose() {
    this.materials.forEach((mat) => {
      mat.dispose();
    });
    this.materials.clear();
  }
}
