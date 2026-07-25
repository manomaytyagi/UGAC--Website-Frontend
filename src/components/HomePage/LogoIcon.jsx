import ugacLogo from "../../assets/UGAC Logo.jpeg";

export default function LogoIcon({ size = 36 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-block",
        overflow: "hidden",
        position: "relative",
        flex: "0 0 auto",
      }}
      aria-hidden="true"
    >
      <img
        src={ugacLogo}
        alt=""
        style={{
          width: size * 3.05,
          height: size * 3.05,
          maxWidth: "none",
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -41%)",
        }}
      />
    </span>
  );
}
