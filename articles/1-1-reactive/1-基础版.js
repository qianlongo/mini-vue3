let bucket = new WeakMap()
let activeEffect = null
let effectStack = []

function effect (fn) {
  const effectFn = () => {
    activeEffect = fn
    effectStack.push(activeEffect)
    activeEffect()
    effectStack.pop()
    activeEffect = effectStack[ effectStack.length - 1 ]
  }

  effectFn()
}

function reactive (state) {
  return new Proxy(state, {
    get (target, key, ctx) {
      track(target, key)

      return Reflect.get(target, key, ctx)
    },
    set (target, key, value, ctx) {
      Reflect.set(target, key, value, ctx)
      trigger(target, key)
    }
  })
}

function track (target, key) {
  let depsMap = bucket.get(target)

  if (!depsMap) {
    bucket.set(target, depsMap = new Map())
  }

  let deps = depsMap.get(key)

  if (!deps) {
    depsMap.set(key, deps = new Set())
  }

  activeEffect && deps.add(activeEffect)
}

function trigger (target, key) {
  const depsMap = bucket.get(target)

  if (depsMap) {
    const deps = depsMap.get(key)

    deps.forEach((fn) => {
      fn && fn()
    })
  }
}

let state = reactive({
  name: 'fatfish',
  age: 100
})

effect(() => {
  console.log('---', state.name, state.age)
})

setTimeout(() => {
  state.name = 'vue3'
  state.age = 1000
}, 1000)