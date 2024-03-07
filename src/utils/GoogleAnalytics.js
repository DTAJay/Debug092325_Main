import ReactGA from "react-ga4";
import { MASTER_MEASUREMENT_ID } from "@/utils/Constants"; // property's measurement id

const initialize = (trackingId = MASTER_MEASUREMENT_ID) => {
  // init property
  ReactGA.reset();
  ReactGA.initialize(trackingId);
};

const emitEvent = (eventName, parameters) => {
  // send event to property
  if (eventName && parameters) {
    ReactGA.event(eventName, parameters);
  }
};

const GoogleAnalytics = {
  initialize,
  emitEvent,
};

export default GoogleAnalytics;
