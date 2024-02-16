import { useEffect, useState } from "react";

import ScheduleService from "@/services/Schedule";

import { isEmpty, getIndexFromArr } from "@/utils/Functions";
import {
  SCHEDULED_JSON_KEY,
  SCREEN_ID,
  DEBUG_MODE,
  GA4_EVENT_SLOT_TRANSITION,
  AD_POSITION_BOTTOM,
  AD_POSITION_TOP,
} from "@/utils/Constants";
import preloadImage from "@/utils/PreloadImage";
import GoogleAnalytics from "@/utils/GoogleAnalytics";

// get given slot's duration
const getSlotDuration = (slots, index) => {
  if (index >= slots.length) {
    return -1;
  } else if (index === slots.length - 1) {  // if the given slot is last one, return its duration same as previous
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

  // call when should load new remote json
  const getRemoteJson = () => {
    // call the axios instance for fetching the remote json
    ScheduleService.getSchedule()
      .then((res) => {
        const remoteJson = JSON.parse(res.data); // parse schedules from string to json
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

        localStorage.setItem(SCHEDULED_JSON_KEY, JSON.stringify(tempSchedules));

        setSchedules(tempSchedules);

        if (!isExpiredSlots(slots)) {
          setCurrentSlot(slots[getCurrentSlotIndex(slots)]);
        } else {
          console.log(
            "Please request updating schedule to administrator!"
          );
        }
      })
      .catch((err) => {
        DEBUG_MODE &&
          console.error(
            "Sorry, but an error has been ocurred while parsing schedule list!",
            err
          );
      });
  };

  // call at first loading component
  useEffect(() => {
    let scheduleData = JSON.parse(
      localStorage.getItem(SCHEDULED_JSON_KEY) || "{}"
    ); // get local schedule json.

    if (isEmpty(scheduleData)) {
      getRemoteJson(); // if not exist yet, fetch json from remote
    } else {
      if (isExpiredSlots(scheduleData.slots)) {
        // if existing json has been expired, remove it, and then, load new one
        localStorage.removeItem(SCHEDULED_JSON_KEY);
        getRemoteJson();
      } else {
        setSchedules(scheduleData); // else take the schedules from local storage
        setCurrentSlot(
          scheduleData.slots[getCurrentSlotIndex(scheduleData.slots)]
        ); // load the slot to be displayed at the current
      }
    }
  }, []);

  // call when should update the current slot
  useEffect(() => {
    if (isEmpty(currentSlot)) {
      return;
    }

    DEBUG_MODE && console.log(currentSlot);

    let nextSlotIndex =
      getIndexFromArr(schedules.slots, "id", currentSlot.id) + 1;
    // update the current slot
    const transitionSlot = () => {
      if (nextSlotIndex >= schedules.slots.length) {
        // no more slot for this period
        localStorage.removeItem(SCHEDULED_JSON_KEY);
        getRemoteJson(); // load new json for new period
        return;
      }
      setCurrentSlot(schedules.slots[nextSlotIndex]); // update the slot to be displayed
    };

    // preload images for next slot
    if (nextSlotIndex < schedules.slots.length) {
      preloadImage(schedules?.slots[nextSlotIndex].adImageUrl);
      preloadImage(schedules?.slots[nextSlotIndex].footerImageUrl);
    }

    let timeout = setTimeout(
      transitionSlot,
      getSlotDuration(schedules.slots, nextSlotIndex - 1) -
        (new Date().getTime() - currentSlot.timestamp)
    ); // call callback after remained time

    GoogleAnalytics.emitEvent(GA4_EVENT_SLOT_TRANSITION, {
      // send ad-play event
      advertiser_id: currentSlot.adAdvertiserId, // custom dimension - advertiser's id
      ad_position: AD_POSITION_TOP, // custom dimension - ad's position
      device_id: currentSlot.deviceId, // custom dimension - device's id
      screen_id: schedules.screenId, // custom dimension - screen's id
    });
    GoogleAnalytics.emitEvent(GA4_EVENT_SLOT_TRANSITION, {
      // send footer-play event
      advertiser_id: currentSlot.footerAdvertiserId,
      ad_position: AD_POSITION_BOTTOM,
      device_id: currentSlot.deviceId,
      screen_id: schedules.screenId,
    });

    return () => {
      clearTimeout(timeout);
    };
  }, [currentSlot]);

  return (
    <>
      <div
        className="rotate-90 origin-bottom-left"
        style={{ marginTop: schedules.screenHeight * -1 + "px" }}
      >
        {currentSlot?.adImageUrl && (
          <div
            id="ad"
            style={{
              backgroundImage: `url(${currentSlot?.adImageUrl})`,
              width: schedules.adWidth + "px",
              height: schedules.adHeight + "px",
            }}
          ></div>
        )}
        {currentSlot?.footerImageUrl && (
          <div
            id="footer"
            style={{
              backgroundImage: `url(${currentSlot?.footerImageUrl})`,
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
