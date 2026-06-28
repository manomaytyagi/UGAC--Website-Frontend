import ugacLogo from "../assets/UGAC Logo.jpeg";

export default function LogoIcon({ size = 36 }) {
  return (
    <img
      src={ugacLogo}
      alt=""
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        display: "block"
      }}
    />
  );
}
