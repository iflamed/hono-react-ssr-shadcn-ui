import { storeViewByName } from "./renderer";
import BlogList from "./view/BlogList";
import Blogs from "./view/Blogs";
import BlogUpdateForm from "./view/BlogUpdateForm";
import Hello from "./view/Hello";
import ShowPost from "./view/ShowPost";

export default function initView() {
    storeViewByName('hello', Hello)
    storeViewByName('bloglist', BlogList)
    storeViewByName('blogupdateform', BlogUpdateForm)
    storeViewByName('blogs', Blogs)
    storeViewByName('post', ShowPost)
}