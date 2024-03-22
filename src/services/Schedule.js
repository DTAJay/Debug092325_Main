import { DEBUG_MODE, SCREEN_ID } from "@/utils/Constants";
import http from "@/utils/Http";

const _API = ""; // prefix url for schedule api

// get the remote json from wp engine with screen ID
const getSchedule = () => {
  return new Promise((resolve, reject) => {
    http
      .get(_API + `/screen?screen=${SCREEN_ID}`) // method: GET
      .then((response) => {
        // if api call has been succeeded
        if (response.status === 200) {
          resolve(response);
        } else {
          reject(response);
        }
      })
      .catch((error) => {
        // if it has error from server.
        if (!DEBUG_MODE) console.clear(); // clear the console log in prod mode
        reject(error.response);
      });
  });
};

const ScheduleService = {
  getSchedule,
};

export default ScheduleService;
