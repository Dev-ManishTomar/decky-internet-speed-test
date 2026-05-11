import { staticClasses } from "@decky/ui";
import { definePlugin } from "@decky/api";
import { FaTachometerAlt } from "react-icons/fa";
import { SpeedTestPanel } from "./components/SpeedTestPanel";

export default definePlugin(() => {
  console.log("SpeedTest plugin initializing");

  return {
    name: "Internet Speed Test",
    titleView: (
      <div className={staticClasses.Title} style={{ fontSize: "16px" }}>Internet Speed Test</div>
    ),
    content: <SpeedTestPanel />,
    icon: <FaTachometerAlt />,
    onDismount() {
      console.log("SpeedTest plugin unloading");
    },
  };
});
