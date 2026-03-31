<script>
  import svelteLogo from './assets/svelte.svg'
  import vegasLogo from './assets/vegas.webp'
  import heroImg from './assets/hero.png'
  import githubIcon from './assets/github.svg'
  import Counter from './lib/Counter.svelte'
</script>

<section id="center">
  <div class="hero">
    <img src={heroImg} class="base" width="170" height="179" alt="" />
    <img src={svelteLogo} class="framework" alt="Svelte logo" />
    <img src={vegasLogo} class="vegas" alt="Vegas logo" />
  </div>
  <div>
    <h1>Get started</h1>
    <p>Edit <code>src/App.svelte</code> and save to test fast <code>FBR</code></p>
  </div>
  <Counter />
</section>

<div class="ticks"></div>

<section id="next-steps">
  <div id="docs">
    <h2>Documentation</h2>
    <p>Your questions, answered</p>
    <ul>
      <li>
        <a href="https://vegasjs.dev/" target="_blank" rel="noreferrer">
          <img class="logo" src={vegasLogo} alt="" />
          Explore Vegas
        </a>
      </li>
      <li>
        <a href="https://svelte.dev/" target="_blank" rel="noreferrer">
          <img class="button-icon" src={svelteLogo} alt="" />
          Learn more
        </a>
      </li>
    </ul>
  </div>
  <div id="social">
    <h2>Connect with us</h2>
    <p>Join the Vegas community</p>
    <ul>
      <li>
        <a href="https://github.com/vegas-js/vegas" target="_blank" rel="noreferrer">
          <img class="button-icon" src={githubIcon} alt="" />
          GitHub
        </a>
      </li>
    </ul>
  </div>
</section>

<div class="ticks"></div>
<section id="spacer"></section>
