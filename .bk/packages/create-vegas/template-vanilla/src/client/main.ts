import './style.css'
import typescriptLogo from './assets/typescript.svg'
import vegasLogo from './assets/vegas.webp'
import heroImg from './assets/hero.png'
import githubIcon from './assets/github.svg'
import { setupCounter } from './counter.ts'

document.querySelector<HTMLDivElement>('#root')!.innerHTML = `
<section id="center">
  <div class="hero">
    <img src="${heroImg}" class="base" width="170" height="179">
    <img src="${typescriptLogo}" class="framework" alt="TypeScript logo"/>
    <img src=${vegasLogo} class="vegas" alt="Vegas logo" />
  </div>
  <div>
    <h1>Get started</h1>
    <p>Edit <code>src/main.ts</code> and save to test fast <code>FBR</code></p>
  </div>
  <button id="counter" type="button" class="counter"></button>
</section>

<div class="ticks"></div>

<section id="next-steps">
  <div id="docs">
    <h2>Documentation</h2>
    <p>Your questions, answered</p>
    <ul>
      <li>
        <a href="https://vegasjs.dev/" target="_blank">
          <img class="logo" src=${vegasLogo} alt="" />
          Explore Vegas
        </a>
      </li>
      <li>
        <a href="https://www.typescriptlang.org" target="_blank">
          <img class="button-icon" src="${typescriptLogo}" alt="">
          Learn more
        </a>
      </li>
    </ul>
  </div>
  <div id="social">
    <h2>Connect with us</h2>
    <p>Join the Vegas community</p>
    <ul>
      <li><a href="https://github.com/vegas-js/vegas" target="_blank"><img src=${githubIcon} class="button-icon" alt="" />GitHub</a></li>
    </ul>
  </div>
</section>

<div class="ticks"></div>
<section id="spacer"></section>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)
