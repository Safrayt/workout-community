import type { ComponentType, ReactElement } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";

import ProtectedLayout from "./ProtectedLayout";
import RootLayout from "../components/layout/RootLayout";
import Layout from "../components/layout/Layout";
import type { RouteHandle } from "./guestAccess";


import LegacyDiaryRedirect from "../pages/LegacyDiaryRedirect/LegacyDiaryRedirect";
import RequireAdmin from "./RequireAdmin";


/**
 * Страница подгружается отдельным файлом при первом переходе на неё,
 * а не входит в общий бандл. handle (заголовок, доступ гостя) остаётся
 * в самом маршруте, поэтому RouteMeta и проверки доступа работают, не
 * дожидаясь загрузки файла страницы. wrap — обёртка вокруг страницы
 * (например, RequireAdmin).
 */
function lazyPage(
  load: () => Promise<{ default: ComponentType }>,
  wrap?: (Page: ComponentType) => ReactElement
): () => Promise<{ Component: ComponentType }> {
  return async () => {
    const Page = (await load()).default;

    return { Component: wrap ? () => wrap(Page) : Page };
  };
}

function PageLoading() {
  return (
    <p role="status" style={{ padding: "2rem", textAlign: "center" }}>
      Загрузка…
    </p>
  );
}

export const router = createBrowserRouter([
  {
    // Общий корень без адреса: заголовки вкладок (RouteMeta) для всех
    // страниц, в том числе вне основного Layout (вход, политика).
    element: <RootLayout />,
    // Пока загружается файл первой открытой страницы (страницы
    // подгружаются лениво, см. lazyPage), вместо пустого экрана.
    HydrateFallback: PageLoading,
    children: [
  {
    // Вход — в обычном макете, с шапкой и подвалом: сюда перенаправляют
    // гостя с главной, и без навигации ему было бы некуда пойти, кроме
    // как зарегистрироваться, хотя площадки, события, упражнения и
    // статьи открыты и без входа. Макет не требует провайдеров
    // (см. ProtectedLayout). /register и /recover намеренно остались
    // без шапки: после них показывается ключ восстановления, который
    // нельзя потерять, случайно уйдя по ссылке из навигации.
    element: <Layout />,
    children: [
      {
        path: "/login",
        handle: { title: "Вход" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/Login/Login")),
      },
    ],
  },
  {
    path: "/register",
    handle: { title: "Регистрация" } satisfies RouteHandle,
    lazy: lazyPage(() => import("../pages/Register/Register")),
  },
  {
    path: "/recover",
    handle: { title: "Восстановление доступа" } satisfies RouteHandle,
    lazy: lazyPage(() => import("../pages/Recover/Recover")),
  },
  {
    // Публичные — доступны и без входа: их читают в том числе до
    // регистрации (ссылка с чекбокса на странице /register).
    path: "/privacy",
    handle: { title: "Политика конфиденциальности" } satisfies RouteHandle,
    lazy: lazyPage(() => import("../pages/PrivacyPolicy/PrivacyPolicy")),
  },
  {
    path: "/terms",
    handle: { title: "Пользовательское соглашение" } satisfies RouteHandle,
    lazy: lazyPage(() => import("../pages/TermsOfService/TermsOfService")),
  },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      {
        index: true,
        handle: { title: "Главная" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/Home/Home")),
      },
      {
        path: "profile",
        handle: { title: "Мой профиль" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/Profile/Profile")),
      },
      {
        path: "u/:username",
        handle: { title: ({ username }) => `Профиль ${username}` } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/Profile/Profile")),
      },
      {
        path: "u/:username/diary",
        handle: { title: ({ username }) => `Дневник — ${username}` } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/UserDiary/UserDiary")),
      },
      {
        path: "u/:username/events",
        handle: { title: ({ username }) => `События — ${username}` } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/UserEvents/UserEvents")),
      },
      {
        path: "u/:username/events/past/:role",
        handle: { title: ({ username }) => `Прошедшие события — ${username}` } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/PastEvents/PastEvents")),
      },
      {
        path: "u/:username/achievements",
        handle: { title: ({ username }) => `Достижения — ${username}` } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/Achievements/Achievements")),
      },
      {
        path: "u/:username/subscriptions",
        handle: { title: ({ username }) => `Подписки — ${username}` } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/Subscriptions/Subscriptions")),
      },
      {
        path: "profile/edit",
        handle: { title: "Редактирование профиля" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/EditProfile/EditProfile")),
      },
      {
        path: "profile/tags",
        handle: { title: "Мои теги" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/PersonalTags/PersonalTags")),
      },
      {
        path: "profile/settings",
        handle: { title: "Настройки аккаунта" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/AccountSettings/AccountSettings")),
      },
      {
        path: "profile/subscriptions",
        handle: { title: "Мои подписки" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/Subscriptions/Subscriptions")),
      },
      {
        path: "profile/events",
        handle: { title: "Мои события" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/MyEvents/MyEvents")),
      },
      {
        path: "profile/events/past/:role",
        handle: { title: "Прошедшие события" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/PastEvents/PastEvents")),
      },
      {
        path: "achievements",
        handle: { title: "Достижения" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/Achievements/Achievements")),
      },
      {
        path: "events",
        lazy: lazyPage(() => import("../pages/Events/Events")),
        handle: { title: "События", description: "Тренировки и события сообщества уличной тренировки: даты, места проведения и участники.", guest: ["events"] } satisfies RouteHandle,
      },
      {
        path: "events/:id",
        lazy: lazyPage(() => import("../pages/EventDetails/EventDetails")),
        handle: { guest: ["events"] } satisfies RouteHandle,
      },
      {
        path: "events/:id/edit",
        handle: { title: "Редактирование события" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/EditEvent/EditEvent")),
      },
      {
          path: "events/create",
          handle: { title: "Новое событие" } satisfies RouteHandle,
          lazy: lazyPage(() => import("../pages/CreateEvent/CreateEvent")),
      },
      {
        path: "diary",
        handle: { title: "Дневник" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/Diary/Diary")),
      },
      {
        path: "notifications",
        handle: { title: "Уведомления" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/Notifications/Notifications")),
      },
      {
        path: "diary/create",
        handle: { title: "Новая запись" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/AddDiaryEntry/AddDiaryEntry")),
      },
      {
        path: "diary/create/workout",
        handle: { title: "Новая тренировка" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/AddWorkoutEntry/AddWorkoutEntry")),
      },
      {
        path: "diary/create/note",
        handle: { title: "Новая заметка" } satisfies RouteHandle,
        lazy: lazyPage(() => import("../pages/AddDiaryNote/AddDiaryNote")),
      },
      // Канонические адреса записей — в дневнике их автора (см.
      // utils/diaryPaths.ts); старые /diary/:id и /diary/notes/:id
      // остались только как редиректы на них.
      {
        path: "u/:username/diary/notes/:id",
        lazy: lazyPage(() => import("../pages/DiaryNoteDetails/DiaryNoteDetails")),
      },
      {
        path: "u/:username/diary/:id",
        lazy: lazyPage(() => import("../pages/WorkoutEntryDetails/WorkoutEntryDetails")),
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
        lazy: lazyPage(() => import("../pages/Playgrounds/Playgrounds")),
        handle: { title: "Площадки", description: "Карта площадок для воркаута и уличных тренировок: оборудование, покрытие, доступ и отзывы.", guest: ["playgrounds"] } satisfies RouteHandle,
      },
      {
          path: "playgrounds/:id",
          lazy: lazyPage(() => import("../pages/PlaygroundDetails/PlaygroundDetails")),
          handle: { guest: ["playground"] } satisfies RouteHandle,
      },
      {
          path: "playgrounds/:id/edit",
          handle: { title: "Редактирование площадки" } satisfies RouteHandle,
          lazy: lazyPage(() => import("../pages/EditPlayground/EditPlayground")),
      },
      {
          path: "playgrounds/:id/history",
          handle: { title: "История изменений площадки" } satisfies RouteHandle,
          lazy: lazyPage(() => import("../pages/PlaygroundHistory/PlaygroundHistory")),
      },
      {
          path: "playgrounds/:id/reviews",
          handle: { title: "Отзывы о площадке" } satisfies RouteHandle,
          lazy: lazyPage(() => import("../pages/PlaygroundReviewsList/PlaygroundReviewsList")),
      },
      {
          path: "playgrounds/:id/reviews/create",
          handle: { title: "Новый отзыв" } satisfies RouteHandle,
          lazy: lazyPage(() => import("../pages/WriteReview/WriteReview")),
      },
      {
          path: "playgrounds/:id/events",
          handle: { title: "События на площадке" } satisfies RouteHandle,
          lazy: lazyPage(() => import("../pages/PlaygroundEventsList/PlaygroundEventsList")),
      },
            {
          path: "playgrounds/add",
          handle: { title: "Новая площадка" } satisfies RouteHandle,
          lazy: lazyPage(() => import("../pages/AddPlayground/AddPlayground")),
      },
      {
          path: "complexes",
          lazy: lazyPage(() => import("../pages/Complexes/Complexes")),
          handle: { title: "Комплексы", description: "Каталог комплексов упражнений для уличной тренировки: схемы, форматы, результаты и рейтинг участников.", guest: ["complexes"] } satisfies RouteHandle,
      },
      {
          path: "complexes/create",
          handle: { title: "Новый комплекс" } satisfies RouteHandle,
          lazy: lazyPage(
              () => import("../pages/ComplexCreate/ComplexCreate"),
              (Page) => (
                  <RequireAdmin>
                      <Page />
                  </RequireAdmin>
              )
          ),
      },
      {
          path: "complexes/:id",
          lazy: lazyPage(() => import("../pages/ComplexDetails/ComplexDetails")),
          handle: { guest: ["complex"] } satisfies RouteHandle,
      },
      {
          // Прохождение комплекса с помощником — только для вошедших
          // (нет guest в handle).
          path: "complexes/:id/run",
          lazy: lazyPage(() => import("../pages/ComplexRun/ComplexRun")),
          handle: { title: "Прохождение комплекса" } satisfies RouteHandle,
      },
      {
          // «Все результаты» — рейтинг по всем пользователям. Открыт
          // и гостям; каталогу комплексов нужен только ComplexProvider.
          path: "complexes/:id/results",
          lazy: lazyPage(() => import("../pages/ComplexResults/ComplexResults")),
          handle: { guest: ["complexes"] } satisfies RouteHandle,
      },
      {
          path: "complexes/:id/edit",
          handle: { title: "Редактирование комплекса" } satisfies RouteHandle,
          lazy: lazyPage(
              () => import("../pages/ComplexEdit/ComplexEdit"),
              (Page) => (
                  <RequireAdmin>
                      <Page />
                  </RequireAdmin>
              )
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
          lazy: lazyPage(() => import("../pages/AdminUsers/AdminUsers")),
      },
      {
          path: "programs",
          lazy: lazyPage(() => import("../pages/Programs/Programs")),
          handle: { title: "Программы", description: "Программы тренировок для воркаута и калистеники: структура, версии и обсуждение.", guest: ["programs"] } satisfies RouteHandle,
      },
      {
          path: "programs/create",
          handle: { title: "Новая программа" } satisfies RouteHandle,
          lazy: lazyPage(() => import("../pages/ProgramCreate/ProgramCreate")),
      },
      {
          path: "programs/:id",
          lazy: lazyPage(() => import("../pages/ProgramDetails/ProgramDetails")),
          handle: { guest: ["program"] } satisfies RouteHandle,
      },
      {
          path: "programs/:id/edit",
          handle: { title: "Редактирование программы" } satisfies RouteHandle,
          lazy: lazyPage(() => import("../pages/ProgramEdit/ProgramEdit")),
      },
      {
          // Вся история версий — публичная, как и раздел с последней
          // версией на странице программы.
          path: "programs/:id/versions",
          lazy: lazyPage(() => import("../pages/ProgramVersions/ProgramVersions")),
          handle: { guest: ["programVersions"] } satisfies RouteHandle,
      },
      {
          path: "programs/:id/versions/:versionId",
          lazy: lazyPage(() => import("../pages/ProgramVersionDetails/ProgramVersionDetails")),
      },
      {
          // Схема текущей версии — публичная, как и страница программы.
          path: "programs/:id/schemes/:schemeId",
          lazy: lazyPage(() => import("../pages/ProgramSchemeDetails/ProgramSchemeDetails")),
          handle: { guest: ["programScheme"] } satisfies RouteHandle,
      },
      {
          // Схема конкретной версии — как и сама страница версии, только
          // для вошедших пользователей.
          path: "programs/:id/versions/:versionId/schemes/:schemeId",
          lazy: lazyPage(() => import("../pages/ProgramSchemeDetails/ProgramSchemeDetails")),
      },
      {
          // Прохождение автоматической схемы с таймерами — только для
          // вошедших пользователей (поэтому без handle.guest).
          path: "programs/:id/schemes/:schemeId/run",
          lazy: lazyPage(() => import("../pages/ProgramSchemeRun/ProgramSchemeRun")),
          handle: { title: "Прохождение схемы" } satisfies RouteHandle,
      },
      {
          path: "programs/:id/versions/:versionId/schemes/:schemeId/run",
          lazy: lazyPage(() => import("../pages/ProgramSchemeRun/ProgramSchemeRun")),
          handle: { title: "Прохождение схемы" } satisfies RouteHandle,
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
          lazy: lazyPage(() => import("../pages/KnowledgeExercises/KnowledgeExercises")),
          handle: { title: "Упражнения", description: "База упражнений для воркаута и калистеники: техника выполнения, целевые мышцы, оборудование и типы движений.", guest: ["exercises"] } satisfies RouteHandle,
      },
      {
          // Статичный сегмент "create" в React Router важнее :id, поэтому
          // /knowledge/exercises/create не принимается за упражнение
          // (на сервере слаг "create" тоже зарезервирован).
          path: "knowledge/exercises/create",
          handle: { title: "Новое упражнение" } satisfies RouteHandle,
          lazy: lazyPage(
              () => import("../pages/KnowledgeExerciseCreate/KnowledgeExerciseCreate"),
              (Page) => (
                  <RequireAdmin redirectTo="/knowledge/exercises">
                      <Page />
                  </RequireAdmin>
              )
          ),
      },
      {
          path: "knowledge/exercises/:id",
          lazy: lazyPage(() => import("../pages/KnowledgeExerciseDetails/KnowledgeExerciseDetails")),
          handle: { guest: ["exercise"] } satisfies RouteHandle,
      },
      {
          path: "knowledge/exercises/:id/edit",
          handle: { title: "Редактирование упражнения" } satisfies RouteHandle,
          lazy: lazyPage(
              () => import("../pages/KnowledgeExerciseEdit/KnowledgeExerciseEdit"),
              (Page) => (
                  <RequireAdmin redirectTo="/knowledge/exercises">
                      <Page />
                  </RequireAdmin>
              )
          ),
      },
      {
          path: "knowledge/articles",
          lazy: lazyPage(() => import("../pages/KnowledgeArticles/KnowledgeArticles")),
          handle: { title: "Статьи", description: "Статьи о воркауте, калистенике и тренировочном процессе.", guest: [] } satisfies RouteHandle,
      },
      {
          // Как и у упражнений: статичный "create" важнее :id, а на
          // сервере слаг "create" зарезервирован.
          path: "knowledge/articles/create",
          handle: { title: "Новая статья" } satisfies RouteHandle,
          lazy: lazyPage(
              () => import("../pages/KnowledgeArticleCreate/KnowledgeArticleCreate"),
              (Page) => (
                  <RequireAdmin redirectTo="/knowledge/articles">
                      <Page />
                  </RequireAdmin>
              )
          ),
      },
      {
          path: "knowledge/articles/:id",
          lazy: lazyPage(() => import("../pages/KnowledgeArticleDetails/KnowledgeArticleDetails")),
          handle: { guest: [] } satisfies RouteHandle,
      },
      {
          path: "knowledge/articles/:id/edit",
          handle: { title: "Редактирование статьи" } satisfies RouteHandle,
          lazy: lazyPage(
              () => import("../pages/KnowledgeArticleEdit/KnowledgeArticleEdit"),
              (Page) => (
                  <RequireAdmin redirectTo="/knowledge/articles">
                      <Page />
                  </RequireAdmin>
              )
          ),
      },
      {
          // Любой не совпавший путь внутри защищённой части сайта —
          // так залогиненный пользователь при опечатке в URL видит
          // 404 в привычном лэйауте (с шапкой/навигацией), а не
          // выпадает из него.
          path: "*",
          handle: { title: "Страница не найдена" } satisfies RouteHandle,
          lazy: lazyPage(() => import("../pages/NotFound/NotFound")),
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
      lazy: lazyPage(() => import("../pages/NotFound/NotFound")),
  },
    ],
  },
]);
