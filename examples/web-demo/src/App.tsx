import Image from 'next/image';

export default function App() {
  return (
    <main>
      <img src="/hero.png" />
      <Image src="/team.jpg" width={400} height={300} />
      <img src="/logo.svg" alt="logo.svg" />

      <h2></h2>

      <a onClick={() => openModal()}>Open settings</a>
      <a href="/about"></a>

      <button onClick={() => save()}>
        <svg aria-hidden="true" />
      </button>

      <div onClick={() => toggle()}>Expand section</div>

      <input type="email" placeholder="Email address" />

      <div role="checkbox" tabIndex={0} onClick={() => check()} onKeyDown={() => check()} />

      <div aria-lable="profile card" tabIndex={2}>
        <iframe src="https://maps.example.com/embed" />
      </div>

      <video src="/intro.mp4" controls />
    </main>
  );
}

declare function openModal(): void;
declare function save(): void;
declare function toggle(): void;
declare function check(): void;
