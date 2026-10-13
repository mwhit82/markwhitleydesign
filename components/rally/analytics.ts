import { cars } from "./data";
import { lapCount, timeOfDay, trackNumber, type StageSelection } from "./stages";

/** Rounds seconds to the hundredths shown in the HUD, keeping payloads small. */
export const seconds = (value: number) => Math.round(value * 100) / 100;

/** The race setup shared by Pocket Rally Track Events. */
export function setupProperties(selection: StageSelection, car: number) {
  return {
    stage: selection.stage,
    track: trackNumber(selection),
    weather: selection.weather,
    timeOfDay: timeOfDay(selection),
    reverse: selection.reverse,
    laps: lapCount(selection),
    car,
    carName: cars[car]?.name,
  };
}
