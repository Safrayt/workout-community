import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedLayout from "./ProtectedLayout";
import RootLayout from "../components/layout/RootLayout";
import type { RouteHandle } from "./guestAccess";

import Login from "../pages/Login/Login";
import Register from "../pages/Register/Register";
import Recover from "../pages/Recover/Recover";
import PrivacyPolicy from "../pages/PrivacyPolicy/PrivacyPolicy";
import TermsOfService from "../pages/TermsOfService/TermsOfService";

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
import Notifications from "../pages/Notifications/Notifications";
import AddDiaryEntry from "../pages/AddDiaryEntry/AddDiaryEntry";
import AddWorkoutEntry from "../pages/AddWorkoutEntry/AddWorkoutEntry";
import AddDiaryNote from "../pages/AddDiaryNote/AddDiaryNote";
import WorkoutEntryDetails from "../pages/WorkoutEntryDetails/WorkoutEntryDetails";
import DiaryNoteDetails from "../pages/DiaryNoteDetails/DiaryNoteDetails";
import LegacyDiaryRedirect from "../pages/LegacyDiaryRedirect/LegacyDiaryRedirect";
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
import Complexes from "../pages/Complexes/Complexes";
import ComplexDetails from "../pages/ComplexDetails/ComplexDetails";
import ComplexResults from "../pages/ComplexResults/ComplexResults";
import ComplexCreate from "../pages/ComplexCreate/ComplexCreate";import ComplexEdit from "../pages/ComplexEdit/ComplexEdit";
import Programs from "../pages/Programs/Programs";
import KnowledgeExercises from "../pages/KnowledgeExercises/KnowledgeExercises";
import KnowledgeExerciseDetails from "../pages/KnowledgeExerciseDetails/KnowledgeExerciseDetails";
import KnowledgeExerciseCreate from "../pages/KnowledgeExerciseCreate/KnowledgeExerciseCreate";
import KnowledgeExerciseEdit from "../pages/KnowledgeExerciseEdit/KnowledgeExerciseEdit";
import KnowledgeArticles from "../pages/KnowledgeArticles/KnowledgeArticles";
import KnowledgeArticleDetails from "../pages/KnowledgeArticleDetails/KnowledgeArticleDetails";
import KnowledgeArticleCreate from "../pages/KnowledgeArticleCreate/KnowledgeArticleCreate";
import KnowledgeArticleEdit from "../pages/KnowledgeArticleEdit/KnowledgeArticleEdit";
import ProgramDetails from "../pages/ProgramDetails/ProgramDetails";
import ProgramCreate from "../pages/ProgramCreate/ProgramCreate";
import ProgramEdit from "../pages/ProgramEdit/ProgramEdit";
import ProgramVersionDetails from "../pages/ProgramVersionDetails/ProgramVersionDetails";
import RequireAdmin from "./RequireAdmin";
import AdminUsers from "../pages/AdminUsers/AdminUsers";
import NotFound from "../pages/NotFound/NotFound";

export const router = createBrowserRouter([
  {
    // Общий корень без адреса: заголовки вкладок (RouteMeta) для всех
    // страниц, в том числе вне основного Layout (вход, политика).
    element: <RootLayout />,
    children: [
  {
    path: "/login",
    handle: { title: "Вход" } satisfies RouteHandle,
    element: <Login />,
  },
  {
    path: "/register",
    handle: { title: "Регистрация" } satisfies RouteHandle,
    element: <Register />,
  },
  {
    path: "/recover",
    handle: { title: "Восстановление доступа" } satisfies RouteHandle,
    element: <Recover />,
  },
  {
    // Публичные — доступны и без входа: их читают в том числе до
    // регистрации (ссылка с чекбокса на странице /register).
    path: "/privacy",
    handle: { title: "Политика конфиденциальности" } satisfies RouteHandle,
    element: <PrivacyPolicy />,
  },
  {
    path: "/terms",
    handle: { title: "Пользовательское соглашение" } satisfies RouteHandle,
    element: <TermsOfService />,
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        handle: { title: "Главная" } satisfies RouteHandle,
        element: <Home />,
      },
      {
        path: "profile",
        handle: { title: "Мой профиль" } satisfies RouteHandle,
        element: <Profile />,
      },
      {
        path: "u/:username",
        handle: { title: ({ username }) => `Профиль ${username}` } satisfies RouteHandle,
        element: <Profile />,
      },
      {
        path: "u/:username/diary",
        handle: { title: ({ username }) => `Дневник — ${username}` } satisfies RouteHandle,
        element: <UserDiary />,
      },
      {
        path: "u/:username/events",
        handle: { title: ({ username }) => `События — ${username}` } satisfies RouteHandle,
        element: <UserEvents />,
      },
      {
        path: "u/:username/events/past/:role",
        handle: { title: ({ username }) => `Прошедшие события — ${username}` } satisfies RouteHandle,
        element: <PastEvents />,
      },
      {
        path: "u/:username/achievements",
        handle: { title: ({ username }) => `Достижения — ${username}` } satisfies RouteHandle,
        element: <Achievements />,
      },
      {
        path: "u/:username/subscriptions",
        handle: { title: ({ username }) => `Подписки — ${username}` } satisfies RouteHandle,
        element: <Subscriptions />,
      },
      {
        path: "profile/edit",
        handle: { title: "Редактирование профиля" } satisfies RouteHandle,
        element: <EditProfile />,
      },
      {
        path: "profile/tags",
        handle: { title: "Мои теги" } satisfies RouteHandle,
        element: <PersonalTags />,
      },
      {
        path: "profile/settings",
        handle: { title: "Настройки аккаунта" } satisfies RouteHandle,
        element: <AccountSettings />,
      },
      {
        path: "profile/subscriptions",
        handle: { title: "Мои подписки" } satisfies RouteHandle,
        element: <Subscriptions />,
      },
      {
        path: "profile/events",
        handle: { title: "Мои события" } satisfies RouteHandle,
        element: <MyEvents />,
      },
      {
        path: "profile/events/past/:role",
        handle: { title: "Прошедшие события" } satisfies RouteHandle,
        element: <PastEvents />,
      },
      {
        path: "achievements",
        handle: { title: "Достижения" } satisfies RouteHandle,
        element: <Achievements />,
      },
      {
        path: "events",
        element: <Events />,
        handle: { title: "События", description: "Тренировки и события сообщества уличной тренировки: даты, места проведения и участники.", guest: ["events"] } satisfies RouteHandle,
      },
      {
        path: "events/:id",
        element: <EventDetails />,
        handle: { guest: ["events"] } satisfies RouteHandle,
      },
      {
        path: "events/:id/edit",
        handle: { title: "Редактирование события" } satisfies RouteHandle,
        element: <EditEvent />,
      },
      {
          path: "events/create",
          handle: { title: "Новое событие" } satisfies RouteHandle,
          element: <CreateEvent />,
      },
      {
        path: "diary",
        handle: { title: "Дневник" } satisfies RouteHandle,
        element: <Diary />,
      },
      {
        path: "notifications",
        handle: { title: "Уведомления" } satisfies RouteHandle,
        element: <Notifications />,
      },
      {
        path: "diary/create",
        handle: { title: "Новая запись" } satisfies RouteHandle,
        element: <AddDiaryEntry />,
      },
      {
        path: "diary/create/workout",
        handle: { title: "Новая тренировка" } satisfies RouteHandle,
        element: <AddWorkoutEntry />,
      },
      {
        path: "diary/create/note",
        handle: { title: "Новая заметка" } satisfies RouteHandle,
        element: <AddDiaryNote />,
      },
      // Канонические адреса записей — в дневнике их автора (см.
      // utils/diaryPaths.ts); старые /diary/:id и /diary/notes/:id
      // остались только как редиректы на них.
      {
        path: "u/:username/diary/notes/:id",
        element: <DiaryNoteDetails />,
      },
      {
        path: "u/:username/diary/:id",
        element: <WorkoutEntryDetails />,
      },
      {
        path: "diary/notes/:id",
        element: <LegacyDiaryRedirect kind="note" />,
      },
      {
        path: "diary/:id",
        element: <LegacyDiaryRedirect kind="workout" />,
      },
      {
        path: "playgrounds",
        element: <Playgrounds />,
        handle: { title: "Площадки", description: "Карта площадок для воркаута и уличных тренировок: оборудование, покрытие, доступ и отзывы.", guest: ["playgrounds"] } satisfies RouteHandle,
      },
      {
          path: "playgrounds/:id",
          element: <PlaygroundDetails />,
          handle: { guest: ["playground"] } satisfies RouteHandle,
      },
      {
          path: "playgrounds/:id/edit",
          handle: { title: "Редактирование площадки" } satisfies RouteHandle,
          element: <EditPlayground />,
      },
      {
          path: "playgrounds/:id/history",
          handle: { title: "История изменений площадки" } satisfies RouteHandle,
          element: <PlaygroundHistory />,
      },
      {
          path: "playgrounds/:id/reviews",
          handle: { title: "Отзывы о площадке" } satisfies RouteHandle,
          element: <PlaygroundReviewsList />,
      },
      {
          path: "playgrounds/:id/reviews/create",
          handle: { title: "Новый отзыв" } satisfies RouteHandle,
          element: <WriteReview />,
      },
      {
          path: "playgrounds/:id/events",
          handle: { title: "События на площадке" } satisfies RouteHandle,
          element: <PlaygroundEventsList />,
      },
            {
          path: "playgrounds/add",
          handle: { title: "Новая площадка" } satisfies RouteHandle,
          element: <AddPlayground />,
      },
      {
          path: "complexes",
          element: <Complexes />,
          handle: { title: "Комплексы", description: "Каталог комплексов упражнений для уличной тренировки: схемы, форматы, результаты и рейтинг участников.", guest: ["complexes"] } satisfies RouteHandle,
      },
      {
          path: "complexes/create",
          handle: { title: "Новый комплекс" } satisfies RouteHandle,
          element: (
              <RequireAdmin>
                  <ComplexCreate />
              </RequireAdmin>
          ),
      },
      {
          path: "complexes/:id",
          element: <ComplexDetails />,
          handle: { guest: ["complex"] } satisfies RouteHandle,
      },
      {
          // «Все результаты» — рейтинг по всем пользователям. Открыт
          // и гостям; каталогу комплексов нужен только ComplexProvider.
          path: "complexes/:id/results",
          element: <ComplexResults />,
          handle: { guest: ["complexes"] } satisfies RouteHandle,
      },
      {
          path: "complexes/:id/edit",
          handle: { title: "Редактирование комплекса" } satisfies RouteHandle,
          element: (
              <RequireAdmin>
                  <ComplexEdit />
              </RequireAdmin>
          ),
      },
      {
          // Раздел "Пользователи" открыт для всех вошедших — доступ
          // ограничивает только сама AdminUsers, скрывая пункты
          // модерации (бейдж "Администратор", "Убрать из ленты",
          // "Удалить") от не-администраторов; RequireAdmin здесь
          // больше не нужен.
          path: "admin/users",
          handle: { title: "Пользователи" } satisfies RouteHandle,
          element: <AdminUsers />,
      },
      {
          path: "programs",
          element: <Programs />,
          handle: { title: "Программы", description: "Программы тренировок для воркаута и калистеники: структура, версии и обсуждение.", guest: ["programs"] } satisfies RouteHandle,
      },
      {
          path: "programs/create",
          handle: { title: "Новая программа" } satisfies RouteHandle,
          element: <ProgramCreate />,
      },
      {
          path: "programs/:id",
          element: <ProgramDetails />,
          handle: { guest: ["program"] } satisfies RouteHandle,
      },
      {
          path: "programs/:id/edit",
          handle: { title: "Редактирование программы" } satisfies RouteHandle,
          element: <ProgramEdit />,
      },
      {
          path: "programs/:id/versions/:versionId",
          element: <ProgramVersionDetails />,
      },
      {
          // База знаний: /knowledge сам по себе страницы не имеет —
          // ведёт на первый подраздел.
          path: "knowledge",
          element: <Navigate to="/knowledge/exercises" replace />,
          handle: { guest: [] } satisfies RouteHandle,
      },
      {
          path: "knowledge/exercises",
          element: <KnowledgeExercises />,
          handle: { title: "Упражнения", description: "База упражнений для воркаута и калистеники: техника выполнения, целевые мышцы, оборудование и типы движений.", guest: ["exercises"] } satisfies RouteHandle,
      },
      {
          // Статичный сегмент "create" в React Router важнее :id, поэтому
          // /knowledge/exercises/create не принимается за упражнение
          // (на сервере слаг "create" тоже зарезервирован).
          path: "knowledge/exercises/create",
          handle: { title: "Новое упражнение" } satisfies RouteHandle,
          element: (
              <RequireAdmin redirectTo="/knowledge/exercises">
                  <KnowledgeExerciseCreate />
              </RequireAdmin>
          ),
      },
      {
          path: "knowledge/exercises/:id",
          element: <KnowledgeExerciseDetails />,
          handle: { guest: ["exercise"] } satisfies RouteHandle,
      },
      {
          path: "knowledge/exercises/:id/edit",
          handle: { title: "Редактирование упражнения" } satisfies RouteHandle,
          element: (
              <RequireAdmin redirectTo="/knowledge/exercises">
                  <KnowledgeExerciseEdit />
              </RequireAdmin>
          ),
      },
      {
          path: "knowledge/articles",
          element: <KnowledgeArticles />,
          handle: { title: "Статьи", description: "Статьи о воркауте, калистенике и тренировочном процессе.", guest: [] } satisfies RouteHandle,
      },
      {
          // Как и у упражнений: статичный "create" важнее :id, а на
          // сервере слаг "create" зарезервирован.
          path: "knowledge/articles/create",
          handle: { title: "Новая статья" } satisfies RouteHandle,
          element: (
              <RequireAdmin redirectTo="/knowledge/articles">
                  <KnowledgeArticleCreate />
              </RequireAdmin>
          ),
      },
      {
          path: "knowledge/articles/:id",
          element: <KnowledgeArticleDetails />,
          handle: { guest: [] } satisfies RouteHandle,
      },
      {
          path: "knowledge/articles/:id/edit",
          handle: { title: "Редактирование статьи" } satisfies RouteHandle,
          element: (
              <RequireAdmin redirectTo="/knowledge/articles">
                  <KnowledgeArticleEdit />
              </RequireAdmin>
          ),
      },
      {
          // Любой не совпавший путь внутри защищённой части сайта —
          // так залогиненный пользователь при опечатке в URL видит
          // 404 в привычном лэйауте (с шапкой/навигацией), а не
          // выпадает из него.
          path: "*",
          handle: { title: "Страница не найдена" } satisfies RouteHandle,
          element: <NotFound />,
      },
    ],
  },
  {
      // Если человек не залогинен и ошибся в URL — ProtectedLayout
      // до рендера детей его и так редиректнёт на /login, так что
      // этот верхнеуровневый catch-all нужен только для путей,
      // которые не подпадают вообще ни под один родительский маршрут.
      path: "*",
          handle: { title: "Страница не найдена" } satisfies RouteHandle,
      element: <NotFound />,
  },
    ],
  },
]);
