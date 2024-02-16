import { stringToBool } from "@/utils/Functions";

// import env
export const DEBUG_MODE = stringToBool(import.meta.env.VITE_DEBUG_MODE);

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const SCREEN_ID = import.meta.env.VITE_SCREEN_ID;

export const MASTER_MEASUREMENT_ID = import.meta.env.VITE_MASTER_MEASUREMENT_ID;

// localStorage keys
export const SCHEDULED_JSON_KEY = "scheduled_json"; //  the key name of localStorage for storing the schedules json data extracted from remote json

// google analytics event name
export const GA4_EVENT_SLOT_TRANSITION = "slot_transition";

// ad position
export const AD_POSITION_TOP = 'top';

export const AD_POSITION_BOTTOM = "bottom";