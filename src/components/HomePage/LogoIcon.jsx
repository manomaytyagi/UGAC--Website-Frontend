import ugacLogoIcon from "../../assets/UGAC Logo Icon.jpeg";

export default function LogoIcon({ size = 36 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(8, size * 0.28),
        background: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        flex: "0 0 auto",
      }}
      aria-hidden="true"
    >
      <img
        src={ugacLogoIcon}
        alt=""
        style={{
          width: "88%",
          height: "88%",
          objectFit: "contain",
          objectPosition: "center",
          display: "block",
        }}
      />
    </span>
  );
}
