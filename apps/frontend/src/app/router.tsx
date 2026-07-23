import { createBrowserRouter } from "react-router-dom";

import Layout from "../components/layout/Layout";

import Home from "../pages/Home/Home";
import Profile from "../pages/Profile/Profile";
import Events from "../pages/Events/Events";
import CreateEvent from "../pages/CreateEvent/CreateEvent";
import Programs from "../pages/Programs/Programs";
import Playgrounds from "../pages/Playgrounds/Playgrounds";
import EventDetails from "../pages/EventDetails/EventDetails";
import PlaygroundDetails from "../pages/PlaygroundDetails/PlaygroundDetails";
import AddPlayground from "../pages/AddPlayground/AddPlayground";

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
          path: "events/create",
          element: <CreateEvent />,
      },
      {
        path: "programs",
        element: <Programs />,
      },
      {
        path: "playgrounds",
        element: <Playgrounds />,
      },
      {
          path: "playgrounds/:id",
          element: <PlaygroundDetails />,
      },
            {
          path: "playgrounds/add",
          element: <AddPlayground />,
      },
    ],
  },
]);