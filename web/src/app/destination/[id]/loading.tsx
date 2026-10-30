import { SkeletonBox } from '@/components/common/Skeleton';
import styles from './page.module.css';

export default function DestinationLoading() {
  return (
    <main className={styles.content}>
      <div style={{ maxWidth: '800px', margin: '32px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SkeletonBox width="140px" height="18px" borderRadius="4px" />
        <SkeletonBox width="60%" height="32px" borderRadius="8px" />
        <SkeletonBox width="100%" height="80px" borderRadius="8px" />
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <SkeletonBox width="140px" height="40px" borderRadius="10px" />
          <SkeletonBox width="120px" height="40px" borderRadius="10px" />
        </div>
      </div>
    </main>
  );
}

