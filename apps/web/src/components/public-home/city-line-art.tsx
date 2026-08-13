import Image from "next/image";
import citycoreConnectedCity from "../../../public/citycore-connected-city.png";
import styles from "./context-gateway.module.css";

export function CityLineArt() {
  return (
    <div className={styles.cityLineArt} aria-hidden="true">
      <Image
        alt=""
        className={styles.cityIllustration}
        height={414}
        priority
        sizes="(max-width: 390px) calc(100vw - 40px), (max-width: 900px) 460px, (max-width: 1100px) 38vw, 500px"
        src={citycoreConnectedCity}
        width={1000}
      />
    </div>
  );
}
