import { createBrowserRouter } from "react-router-dom";

import Layout from "../components/layout/Layout";

import Home from "../pages/Home/Home";
import Profile from "../pages/Profile/Profile";
import EditProfile from "../pages/EditProfile/EditProfile";
import MyEvents from "../pages/MyEvents/MyEvents";
import PastEvents from "../pages/PastEvents/PastEvents";
import AccountSettings from "../pages/AccountSettings/AccountSettings";
import UserDiary from "../pages/UserDiary/UserDiary";
import UserEvents from "../pages/UserEvents/UserEvents";
import Subscriptions from "../pages/Subscriptions/Subscriptions";
import Events from "../pages/Events/Events";
import CreateEvent from "../pages/CreateEvent/CreateEvent";
import Diary from "../pages/Diary/Diary";
import AddDiaryEntry from "../pages/AddDiaryEntry/AddDiaryEntry";
import AddWorkoutEntry from "../pages/AddWorkoutEntry/AddWorkoutEntry";
import AddDiaryNote from "../pages/AddDiaryNote/AddDiaryNote";
import WorkoutEntryDetails from "../pages/WorkoutEntryDetails/WorkoutEntryDetails";
import DiaryNoteDetails from "../pages/DiaryNoteDetails/DiaryNoteDetails";
import Playgrounds from "../pages/Playgrounds/Playgrounds";
import EventDetails from "../pages/EventDetails/EventDetails";
import EditEvent from "../pages/EditEvent/EditEvent";
import PlaygroundDetails from "../pages/PlaygroundDetails/PlaygroundDetails";
import AddPlayground from "../pages/AddPlayground/AddPlayground";
import EditPlayground from "../pages/EditPlayground/EditPlayground";
import PlaygroundHistory from "../pages/PlaygroundHistory/PlaygroundHistory";
import PlaygroundReviewsList from "../pages/PlaygroundReviewsList/PlaygroundReviewsList";
import WriteReview from "../pages/WriteReview/WriteReview";
import PlaygroundEventsList from "../pages/PlaygroundEventsList/PlaygroundEventsList";
import Achievements from "../pages/Achievements/Achievements";
import PersonalTags from "../pages/PersonalTags/PersonalTags";

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
        path: "u/:username",
        element: <Profile />,
      },
      {
        path: "u/:username/diary",
        element: <UserDiary />,
      },
      {
        path: "u/:username/events",
        element: <UserEvents />,
      },
      {
        path: "u/:username/events/past/:role",
        element: <PastEvents />,
      },
      {
        path: "u/:username/achievements",
        element: <Achievements />,
      },
      {
        path: "u/:username/subscriptions",
        element: <Subscriptions />,
      },
      {
        path: "profile/edit",
        element: <EditProfile />,
      },
      {
        path: "profile/tags",
        element: <PersonalTags />,
      },
      {
        path: "profile/settings",
        element: <AccountSettings />,
      },
      {
        path: "profile/subscriptions",
        element: <Subscriptions />,
      },
      {
        path: "profile/events",
        element: <MyEvents />,
      },
      {
        path: "profile/events/past/:role",
        element: <PastEvents />,
      },
      {
        path: "achievements",
        element: <Achievements />,
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
        path: "events/:id/edit",
        element: <EditEvent />,
      },
      {
          path: "events/create",
          element: <CreateEvent />,
      },
      {
        path: "diary",
        element: <Diary />,
      },
      {
        path: "diary/create",
        element: <AddDiaryEntry />,
      },
      {
        path: "diary/create/workout",
        element: <AddWorkoutEntry />,
      },
      {
        path: "diary/create/note",
        element: <AddDiaryNote />,
      },
      {
        path: "diary/notes/:id",
        element: <DiaryNoteDetails />,
      },
      {
        path: "diary/:id",
        element: <WorkoutEntryDetails />,
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
          path: "playgrounds/:id/edit",
          element: <EditPlayground />,
      },
      {
          path: "playgrounds/:id/history",
          element: <PlaygroundHistory />,
      },
      {
          path: "playgrounds/:id/reviews",
          element: <PlaygroundReviewsList />,
      },
      {
          path: "playgrounds/:id/reviews/create",
          element: <WriteReview />,
      },
      {
          path: "playgrounds/:id/events",
          element: <PlaygroundEventsList />,
      },
            {
          path: "playgrounds/add",
          element: <AddPlayground />,
      },
    ],
  },
]);