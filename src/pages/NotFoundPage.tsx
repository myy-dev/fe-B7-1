import { Link } from 'react-router';
import DuckAvatar from '../components/DuckAvatar';

export default function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title" className="w-full max-w-xl text-center">
      <div className="mx-auto mb-6 grid size-40 place-items-center rounded-full bg-secondary sm:size-48">
        <DuckAvatar className="size-32 -rotate-12 sm:size-40" />
      </div>
      <p className="mb-3 text-sm font-bold tracking-widest text-base-content/70">404</p>
      <h1
        id="not-found-title"
        className="text-2xl leading-snug font-extrabold tracking-tight sm:text-4xl"
      >
        앗, 길을 잃었나 봐요!
      </h1>
      <p className="mt-4 leading-relaxed text-base-content/75">
        찾으시는 페이지가 없어요.
        <br />
        꽥꽥이와 처음 화면으로 돌아가 볼까요?
      </p>
      <Link to="/chats" className="btn mt-8 min-h-12 gap-3 px-6 btn-primary">
        처음 화면으로 돌아가기
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
