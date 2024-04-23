import { storeViewByName } from "./renderer";
import Hello from "./view/Hello";

export default function initView() {
    storeViewByName('hello', Hello)
}