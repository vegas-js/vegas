<script setup lang="ts">
import { ref } from 'vue'
import vegasLogo from '../assets/vegas.webp'
import heroImg from '../assets/hero.png'
import vueLogo from '../assets/vue.svg'
import githubIcon from '../assets/github.svg'

const count = ref(0)
</script>

<template>
  <section id="center">
    <div class="hero">
      <img :src="heroImg" class="base" width="170" height="179" alt="" />
      <img :src="vueLogo" class="framework" alt="Vue logo" />
      <img :src="vegasLogo" class="vegas" alt="Vegas logo" />
    </div>
    <div>
      <h1>Get started</h1>
      <p>Edit <code>src/App.vue</code> and save to test fast <code>FBR</code></p>
    </div>
    <button class="counter" @click="count++">Count is {{ count }}</button>
  </section>

  <div class="ticks"></div>

  <section id="next-steps">
    <div id="docs">
      <h2>Documentation</h2>
      <p>Your questions, answered</p>
      <ul>
        <li>
          <a href="https://vegasjs.dev/" target="_blank">
            <img class="logo" :src="vegasLogo" alt="" />
            Explore Vegas
          </a>
        </li>
        <li>
          <a href="https://vuejs.org/" target="_blank">
            <img class="button-icon" :src="vueLogo" alt="" />
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
          <a href="https://github.com/vegas-js/vegas" target="_blank">
            <img class="button-icon" :src="githubIcon" />
            GitHub
          </a>
        </li>
      </ul>
    </div>
  </section>

  <div class="ticks"></div>
  <section id="spacer"></section>
</template>
