import Notyf from "./notyf.min.js";
import "./notyf.min.css";

export const notyf = new (Notyf())({
  duration: 3000,
  position: { x: "center", y: "top" },
  types: [
    {
      type: "success",
      background: "linear-gradient(to bottom right, #ff9494 0%, #ee64f6 100%)",
      icon: {
        className: "jelly-party-icon",
      },
    },
  ],
});
