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
import CachedImage from "@/utils/CachedImage";
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

import DebugInfo from "@/components/DebugInfo";

const Home = () => {
  const [schedules, setSchedules] = useState({}); // schedule data
  const [currentSlot, setCurrentSlot] = useState({}); // current displaying slot
  const [currentAdImage, setCurrentAdImage] = useState("");
  const [currentFooterImage, setCurrentFooterImage] = useState("");
  const [preloadedSlotIndex, setPreloadedSlotIndex] = useState();
  const [debugData, setDebugData] = useState(null);
  const [displayError, setDisplayError] = useState(null);

  // call when should load new remote json
  const getRemoteJson = () => {
    // call the axios instance for fetching the remote json
    setDebugData({
      ...debugData,
      lastApiCall: {
        status: "loading",
        timestamp: new Date().toISOString(),
      },
    });
    ScheduleService.getSchedule()
      .then((res) => {
        const remoteJson = res.data;
        let slots = []; // init slots array

        /// START parsing from remote format to local format ///
        remoteJson.map((item) => {
          const slot = {
            id: item.slot_id, // slot's id
            timestamp: parseInt(item.ad_time, 16) * 1000, // parse timestamp to hex to dec. unit: milliseconds
            ad_time: item.ad_time, // Keep the original ad_time for debugging
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

        // Check for invalid timestamps
        const hasInvalidTimestamp = slots.some(slot => isNaN(slot.timestamp));
        if (hasInvalidTimestamp) {
          setDisplayError("Error: Invalid 'ad_time' in JSON. One or more ad slots have a missing or invalid time value, which prevents the schedule from loading. Please check the source JSON file.");
          // Also update debug data to show the error
          setDebugData({
            ...debugData,
            lastApiCall: {
              status: "error",
              message: "One or more slots have an invalid timestamp.",
              timestamp: new Date().toISOString(),
            },
            schedule: {
              ...tempSchedules,
              slots: tempSchedules.slots.slice(0, 5),
            },
          });
          return; // Stop further processing
        }

        if (!isExpiredSlots(slots)) {
          setDebugData({
            ...debugData,
            lastApiCall: {
              status: "success",
              timestamp: new Date().toISOString(),
            },
            schedule: {
              ...tempSchedules,
              slots: tempSchedules.slots.slice(0, 5),
            },
          });
          CachedImage.clear();
          localStorage.setItem(SCHEDULED_JSON_KEY, JSON.stringify(tempSchedules));
          setSchedules(tempSchedules);
          setCurrentSlot(slots[getCurrentSlotIndex(slots)]);
        } else {
          setDebugData({
            ...debugData,
            lastApiCall: {
              status: "error",
              message: "Received expired slots",
              timestamp: new Date().toISOString(),
            },
          });
          console.log("Please request updating schedule to administrator!");
          setTimeout(getRemoteJson, 180000);  // retry to fetch after 3 minutes
        }
      })
      .catch((err) => {
        setDebugData({
          ...debugData,
          lastApiCall: {
            status: "error",
            message: err.message,
            timestamp: new Date().toISOString(),
          },
        });
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

  // call when should update the current slot
  useEffect(() => {
    if (_.isEmpty(currentSlot)) {
      return;
    }

    let nextSlotIndex =
      _.findIndex(
        schedules.slots,
        (e) => {
          return e?.id === currentSlot.id;
        },
        0
      ) + 1;

    // preload images for the next 120 slots
    if (preloadedSlotIndex === undefined) {
      let currentPreloadedIndex = nextSlotIndex - 1;
      let preloadingIndex = currentPreloadedIndex + 120;
      if(preloadingIndex >= schedules.slots.length) {
        preloadingIndex = schedules.slots.length - 1;
      }
      for (; currentPreloadedIndex < preloadingIndex; currentPreloadedIndex++) {
        const slot = schedules.slots[currentPreloadedIndex];
        CachedImage.add(slot.adImageUrl, schedules.adWidth, schedules.adHeight);
        CachedImage.add(
          slot.footerImageUrl,
          schedules.footerWidth,
          schedules.footerHeight
        );
      }
      setPreloadedSlotIndex(preloadingIndex);
    } else if (preloadedSlotIndex < schedules.slots.length - 1) {
      CachedImage.add(
        schedules.slots[preloadedSlotIndex + 1].adImageUrl,
        schedules.adWidth,
        schedules.adHeight
      );
      CachedImage.add(
        schedules.slots[preloadedSlotIndex + 1].footerImageUrl,
        schedules.footerWidth,
        schedules.footerHeight
      );
      setPreloadedSlotIndex(preloadedSlotIndex + 1);
    }

    // get current ad image from cache
    CachedImage.get(
      currentSlot?.adImageUrl,
      schedules.adWidth,
      schedules.adHeight
    ).then(
      (data) => setCurrentAdImage(data),
      () => setCurrentAdImage("")
    );

    // get current footer image from cache
    CachedImage.get(
      currentSlot?.footerImageUrl,
      schedules.footerWidth,
      schedules.footerHeight
    ).then(
      (data) => setCurrentFooterImage(data),
      () => setCurrentFooterImage("")
    );

    DEBUG_MODE && console.log(currentSlot);

    // update the current slot
    const transitionSlot = () => {
      if (nextSlotIndex >= schedules.slots.length) {
        // no more slot for this period
        localStorage.removeItem(SCHEDULED_JSON_KEY);
        // getRemoteJson(); // load new json for new period
        window.location.reload();
        return;
      }
      setCurrentSlot(schedules.slots[nextSlotIndex]); // update the slot to be displayed
    };

    let timeout = setTimeout(
      transitionSlot,
      getSlotDuration(schedules.slots, nextSlotIndex - 1) -
        (new Date().getTime() - currentSlot.timestamp)
    ); // call callback after remained time

    // send ad-play event
    GoogleAnalytics.emitEvent(GA4_EVENT_SLOT_TRANSITION, {
      advertiser_id: currentSlot.adAdvertiserId, // custom dimension - advertiser's id
      ad_position: AD_POSITION_TOP, // custom dimension - ad's position
      device_id: currentSlot.deviceId, // custom dimension - device's id
      screen_id: schedules.screenId, // custom dimension - screen's id
    });
    // send footer-play event
    GoogleAnalytics.emitEvent(GA4_EVENT_SLOT_TRANSITION, {
      advertiser_id: currentSlot.footerAdvertiserId,
      ad_position: AD_POSITION_BOTTOM,
      device_id: currentSlot.deviceId,
      screen_id: schedules.screenId,
    });

    return () => {
      clearTimeout(timeout);
    };
  }, [currentSlot]);

  if (displayError) {
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
      {DEBUG_MODE && <DebugInfo debugData={debugData} />}
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
