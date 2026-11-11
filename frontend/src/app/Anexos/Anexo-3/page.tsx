import AnexoDetallePage from "@/components/Anexos/AnexoDetallePage";
import { AnexoPlantabaja, AnexoPlantaAlta } from "../../../../public";

export default function AnexoDalmacioVelez() {
  return (
    <AnexoDetallePage
      anexoId={900}
      title="900 - DALMACIO VELEZ N 765"
      plans={[
        { src: AnexoPlantabaja, alt: "Plano planta baja" },
        { src: AnexoPlantaAlta, alt: "Plano planta alta" },
      ]}
    />
  );
}
