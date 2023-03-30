let bucket = new WeakMap()
let activeEffect = null
let effectStack = []

function effect (fn) {
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(activeEffect)
    fn()
    effectStack.pop()
    activeEffect = effectStack[ effectStack.length - 1 ]
  }
  // 用来装一个个的Set，当这个effectFn被执行的时候，将其从中删除
  effectFn.deps = []
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
  activeEffect.deps.push(deps)
}

function trigger (target, key) {
  const depsMap = bucket.get(target)

  if (depsMap) {
    const effects = depsMap.get(key)
    const effectsToRun = new Set(effects)

    effectsToRun && effectsToRun.forEach((fn) => {
      fn && fn()
    })
  }
}

function cleanup (effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[ i ]

    deps.delete(effectFn)
  }

  effectFn.deps.length = 0
}

let state = reactive({
  ok: true,
  text: 'hello'
})

effect(() => {
  const text = state.ok ? state.text : 'no'
  console.log('---', text)
})

setTimeout(() => {
  state.ok = false
}, 1000)

setTimeout(() => {
  // 不希望这里再次被执行，因为无论text被改成什么，text的结果都是no
  state.text = 'Vue3'
}, 1000)