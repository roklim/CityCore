import styles from "./context-gateway.module.css";

export function CityLineArt() {
  return (
    <div className={styles.cityLineArt} aria-hidden="true">
      <svg className={styles.cityIllustration} viewBox="0 0 360 116" fill="none">
        <path d="M8 105.5h344" />
        <path d="M24 105V76h32v29M56 105V62h36v43M92 105V82h28v23" />
        <path d="M31 83h7m7 0h5M66 72h7m8 0h5M66 84h7m8 0h5M101 91h10" />
        <path d="M137 105V47h38v58M132 47h48M146 47V35h20v12M156 35V22" />
        <path d="M146 60h7m9 0h5M146 73h7m9 0h5M146 86h7m9 0h5" />
        <path d="M194 105V72h78v33M202 72l31-18 31 18M225 105V83h17v22" />
        <path d="M285 105V52h42v53M280 52h52M294 66h8m11 0h7M294 80h8m11 0h7" />
        <path d="M18 62c4-7 15-7 19 0 7-2 15 2 16 9H5c1-6 7-10 13-9Z" />
        <path d="M238 34c3-5 11-5 14 0 5-2 12 2 13 7h-40c1-5 7-8 13-7Z" />
      </svg>
    </div>
  );
}
