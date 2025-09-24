import { useEffect, useState } from "react";
import _ from "lodash";

import ScheduleService from "@/services/Schedule";

import {
  SCHEDULED_JSON_KEY,
  SCREEN_ID,
  DEBUG_MODE,
  GA4_EVENT_SLOT_TRANSITION,
  AD_POSITION_BOTTOM,
  AD_POSITION_TOP,
} from "@/utils/Constants";
import GoogleAnalytics from "@/utils/GoogleAnalytics";

// get given slot's duration
const getSlotDuration = (slots, index) => {
  if (index >= slots.length) {
    return -1;
  } else if (index === slots.length - 1) {
    // if the given slot is last one, return its duration same as previous
    return slots[index].timestamp - slots[index - 1].timestamp;
  } else {
    return slots[index + 1].timestamp - slots[index].timestamp;
  }
};

// get current slot's index on schedules array
const getCurrentSlotIndex = (slots) => {
  let index = 0;
  let currentTimestamp = new Date().getTime();
  while (true) {
    if (index >= slots.length) {
      break;
    }
    if (
      currentTimestamp >= slots[index].timestamp &&
      currentTimestamp < slots[index].timestamp + getSlotDuration(slots, index)
    ) {
      return index;
    }
    index++;
  }
  return -1;
};

// check if given schedule is expired
const isExpiredSlots = (slots) => {
  return (
    new Date().getTime() >=
    slots[slots.length - 1].timestamp + getSlotDuration(slots, slots.length - 1)
  );
};

const Home = () => {
  const [schedules, setSchedules] = useState({}); // schedule data
  const [currentSlot, setCurrentSlot] = useState({}); // current displaying slot
  const [currentAdImage, setCurrentAdImage] = useState("");
  const [currentFooterImage, setCurrentFooterImage] = useState("");
  const [displayError, setDisplayError] = useState(null);

  // call when should load new remote json
  const getRemoteJson = () => {
    // call the axios instance for fetching the remote json
    ScheduleService.getSchedule()
      .then((res) => {
        const remoteJson = res.data;
        let slots = []; // init slots array

        /// START parsing from remote format to local format ///
        remoteJson.map((item) => {
          const slot = {
            id: item.slot_id, // slot's id
            timestamp: parseInt(item.ad_time, 16) * 1000, // parse timestamp to hex to dec. unit: milliseconds
            deviceId: item.device_id,
            adAdvertiserId: item.AdvertiserTop,
            adGoogleAnalyticStreamId: item.IMGtopAnalytics,
            adImageUrl: item.IMGtop,
            footerAdvertiserId: item.AdvertiserBottom,
            footerGoogleAnalyticStreamId: item.IMGbottomAnalytics,
            footerImageUrl: item.IMGbottom,
          };

          slots.push(slot); // push new slot to schedules list
        });

        const tempSchedules = {
          date: slots[0].timestamp,
          screenId: SCREEN_ID, // screen id from env
          screenWidth: remoteJson[0].screen_width, // entire screen's width
          screenHeight: remoteJson[0].screen_height, // entire screen's height
          adWidth: remoteJson[0].ad_width, // ad image's width
          adHeight: remoteJson[0].ad_height, // ad image's height
          footerWidth: remoteJson[0].screen_footer_width, // footer image's width
          footerHeight: remoteJson[0].screen_footer_height, // footer image's height
          slots,
        };
        /// END parsing from remote format to local format ///

        if (!isExpiredSlots(slots)) {
          localStorage.setItem(SCHEDULED_JSON_KEY, JSON.stringify(tempSchedules));
          setSchedules(tempSchedules);
          setCurrentSlot(slots[getCurrentSlotIndex(slots)]);
        } else {
          console.log("Please request updating schedule to administrator!");
          setTimeout(getRemoteJson, 180000);  // retry to fetch after 3 minutes
        }
      })
      .catch((err) => {
        DEBUG_MODE &&
          console.error(
            "Could not fetch schedule from remote. Trying to load from local storage.",
            err
          );
        let scheduleData = JSON.parse(
          localStorage.getItem(SCHEDULED_JSON_KEY) || "{}"
        ); // get local schedule json.
        if (!_.isEmpty(scheduleData) && !isExpiredSlots(scheduleData.slots)) {
          setSchedules(scheduleData); // else take the schedules from local storage
          setCurrentSlot(
            scheduleData.slots[getCurrentSlotIndex(scheduleData.slots)]
          ); // load the slot to be displayed at the current
        } else {
          // if no local data or it's expired, retry fetching
          setTimeout(getRemoteJson, 30000);
        }
      });
  };

  // call at first loading component
  useEffect(() => {
    getRemoteJson();
  }, []);

  // This effect handles the display logic when the current ad slot changes
  useEffect(() => {
    if (_.isEmpty(currentSlot) || _.isEmpty(schedules)) {
      return;
    }

    // --- Production Behavior: Directly set image URLs ---
    // In production, we just set the URL. If the URL is invalid, the browser's
    // background-image property will fail silently, which is the desired behavior.
    setCurrentAdImage(currentSlot.adImageUrl || "");
    setCurrentFooterImage(currentSlot.footerImageUrl || "");

    // --- Debug-Only: Check for image loading errors ---
    // In debug mode, we can be more explicit about errors.
    if (DEBUG_MODE) {
      // Check top ad image
      if (currentSlot.adImageUrl) {
        const adImg = new Image();
        adImg.src = currentSlot.adImageUrl;
        adImg.onerror = () => {
          setDisplayError(`DEBUG: Ad image failed to load. Check URL: ${currentSlot.adImageUrl}`);
        };
      } else {
        setDisplayError("DEBUG: Ad image URL is missing in the current slot.");
      }

      // Check footer image
      if (currentSlot.footerImageUrl) {
        const footerImg = new Image();
        footerImg.src = currentSlot.footerImageUrl;
        footerImg.onerror = () => {
          setDisplayError(`DEBUG: Footer image failed to load. Check URL: ${currentSlot.footerImageUrl}`);
        };
      } else {
        setDisplayError("DEBUG: Footer image URL is missing in the current slot.");
      }
    }

    // --- Core Timing Logic ---
    const nextSlotIndex = _.findIndex(schedules.slots, (e) => e.id === currentSlot.id) + 1;

    const transitionSlot = () => {
      if (nextSlotIndex >= schedules.slots.length) {
        localStorage.removeItem(SCHEDULED_JSON_KEY);
        window.location.reload();
        return;
      }
      setCurrentSlot(schedules.slots[nextSlotIndex]);
    };

    const timeoutDuration = getSlotDuration(schedules.slots, nextSlotIndex - 1) - (new Date().getTime() - currentSlot.timestamp);
    const timeout = setTimeout(transitionSlot, timeoutDuration);

    // --- Analytics ---
    GoogleAnalytics.emitEvent(GA4_EVENT_SLOT_TRANSITION, {
      advertiser_id: currentSlot.adAdvertiserId,
      ad_position: AD_POSITION_TOP,
      device_id: currentSlot.deviceId,
      screen_id: schedules.screenId,
    });
    GoogleAnalytics.emitEvent(GA4_EVENT_SLOT_TRANSITION, {
      advertiser_id: currentSlot.footerAdvertiserId,
      ad_position: AD_POSITION_BOTTOM,
      device_id: currentSlot.deviceId,
      screen_id: schedules.screenId,
    });

    return () => clearTimeout(timeout);
  }, [currentSlot, schedules]);

  if (DEBUG_MODE && displayError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#ffdddd',
        color: '#d8000c',
        padding: '20px',
        fontSize: '24px',
        textAlign: 'center',
        border: '2px solid #d8000c',
      }}>
        {displayError}
      </div>
    );
  }

  return (
    <>
      <div
        className="rotate-90 origin-bottom-left"
        style={{ marginTop: schedules.screenHeight * -1 + "px" }}
      >
        {currentAdImage && (
          <div
            id="ad"
            style={{
              backgroundImage: `url(${currentAdImage})`,
              width: schedules.adWidth + "px",
              height: schedules.adHeight + "px",
            }}
          ></div>
        )}
        {currentFooterImage && (
          <div
            id="footer"
            style={{
              backgroundImage: `url(${currentFooterImage})`,
              width: schedules.footerWidth + "px",
              height: schedules.footerHeight + "px",
            }}
          ></div>
        )}
      </div>
    </>
  );
};

export default Home;
