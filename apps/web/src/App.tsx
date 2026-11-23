import { getLesson } from './content/lessons';
import { Home } from './components/Home';
import { LessonPlayer } from './components/LessonPlayer';
import { homeHref, useHashRoute } from './routing/useHashRoute';

export function App() {
  const route = useHashRoute();
  const lesson = route.name === 'lesson' ? getLesson(route.lessonId) : undefined;

  return (
    <main className="shell">
      {route.name === 'home' && <Home />}
      {route.name === 'lesson' && lesson && <LessonPlayer key={lesson.id} lesson={lesson} />}
      {route.name === 'lesson' && !lesson && (
        <p>
          Lesson not found. <a href={homeHref}>Back to home</a>
        </p>
      )}
    </main>
  );
}
