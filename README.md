# Vegas

> **It feels like Vite, and it really is Vite.**

Vegas is a tool for building SPAs on the GAS platform, powered by `Vite` and `Rolldown`, which significantly improves the frontend development experience.

## Features

- Automatically detects web entry points
- Build flow optimized for the GAS platform
- Includes a client library to call GAS functions
- Compatible with Vite plugins

## Quick Start

Development

```sh
npx vegas        # start development server
npx vegas dev    # alternative development command
npx vegas serve  # further alternative
```

Production build

```sh
npx vegas build
```

## Project Structure

### Basic

```plaintext
src/
  ├─ server/
  │  └─ Code.ts
  └─ web/
    └─ main.tsx  // web entry ( to: index.html )
```

### Multi Front / Single GAS

```plaintext
src/
  ├─ server/
  │  └─ Code.ts
  └─ web/
    ├─ sub1/
    │  └─ main.tsx // web entry ( to: dist/sub1.html )
    └─ main.tsx  // web entry ( to: index.html )
```

## License

[MIT License](./LICENSE).

## Afterword

### Note

Vegas is an independent project not affiliated with VoidZero, Inc.

### Thanks

Thanks to everyone who provides Vite, Rolldown, and other tools.
