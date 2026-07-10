import { createBrowserRouter } from "react-router-dom";

import Home from "../pages/Home/Home";
import Profile from "../pages/Profile/Profile";
import Events from "../pages/Events/Events";
import Programs from "../pages/Programs/Programs";
import Map from "../pages/Map/Map";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/profile",
    element: <Profile />,
  },
  {
    path: "/events",
    element: <Events />,
  },
  {
    path: "/programs",
    element: <Programs />,
  },
  {
    path: "/map",
    element: <Map />,
  },
]);