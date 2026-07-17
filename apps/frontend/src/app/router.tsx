import { createBrowserRouter } from "react-router-dom";

import Layout from "../components/layout/Layout";

import Home from "../pages/Home/Home";
import Profile from "../pages/Profile/Profile";
import Events from "../pages/Events/Events";
import Programs from "../pages/Programs/Programs";
import Map from "../pages/Map/Map";
import EventDetails from "../pages/EventDetails/EventDetails";
import PlaygroundDetails from "../pages/PlaygroundDetails/PlaygroundDetails";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "events",
        element: <Events />,
      },
      {
        path: "events/:id",
        element: <EventDetails />,
      },
      {
        path: "programs",
        element: <Programs />,
      },
      {
        path: "map",
        element: <Map />,
      },
      {
          path: "playgrounds/:id",
          element: <PlaygroundDetails />,
      },
    ],
  },
]);