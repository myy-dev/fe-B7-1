import DuckAvatar from '../components/DuckAvatar';

export default function HomePage() {
  return (
    <section aria-labelledby="welcome-title" className="w-full max-w-2xl text-center">
      <div className="relative mx-auto mb-8 grid size-48 place-items-center rounded-full bg-secondary sm:size-56">
        <DuckAvatar className="size-40 sm:size-48" />
        <span className="absolute -top-1 -right-1 -rotate-6 rounded-box border border-base-300 bg-base-100 px-4 py-2 text-sm font-semibold shadow-sm">
          꽥! 반가워요
        </span>
      </div>
      <p className="mb-3 text-sm font-semibold text-base-content/70">당신의 오리 친구</p>
      <h1
        id="welcome-title"
        className="text-3xl leading-snug font-extrabold tracking-tight sm:text-5xl sm:leading-tight"
      >
        반가워요, <br />
        저는 꽥꽥이예요.
      </h1>
      <p className="mt-5 text-base leading-relaxed text-base-content/75 sm:text-lg">
        가벼운 수다부터 말 못 한 고민까지.
        <br />
        편하게 이야기해 주세요.
      </p>
    </section>
  );
}
