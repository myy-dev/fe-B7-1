export default function HomePage() {
  return (
    <section className="card border border-base-300 bg-base-100">
      <div className="card-body gap-6 p-8 sm:p-12">
        <span className="badge badge-outline badge-primary">B7-1</span>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          새로운 프로젝트를 시작합니다
        </h1>
        <p className="max-w-xl leading-relaxed text-base-content/70">
          프론트엔드 개발 환경이 준비되었습니다. 이 화면부터 프로젝트를 만들어가세요.
        </p>
      </div>
    </section>
  );
}
