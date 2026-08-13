import { BackgroundBoxes } from "./BackgroundBoxes";

export function PrismSection() {
  return (
    <section 
      style={{ 
        position: "relative", 
        width: "100%", 
        height: "600px", 
        backgroundColor: "#FFFFFF",
        overflow: "hidden" 
      }}
    >
      <BackgroundBoxes />
    </section>
  );
}