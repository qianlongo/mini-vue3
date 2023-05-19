const bucket = new WeakMap()
// 重新定义bucket数据类型为WeakMap
let activeEffect
const effect = function (fn) {
  activeEffect = fn
  fn()
  // 非常重要
  // activeEffect = null
}
// track表示追踪的意思
function track (target, key) {
  // activeEffect无值意味着没有执行effect函数，无法收集依赖，直接return掉
  if (!activeEffect) {
    return
  }
  // 每个target在bucket中都是一个Map类型： key => effects
  let depsMap = bucket.get(target)
  // 第一次拦截，depsMap不存在，先创建联系
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  // 根据当前读取的key，尝试读取key的effects函数  
  let deps = depsMap.get(key)

  if (!deps) {
    // deps本质是个Set结构，即一个key可以存在多个effect函数，被多个effect所依赖
    depsMap.set(key, (deps = new Set()))
  }
  // 将激活的effectFn存进桶中
  deps.add(activeEffect)
}
// trigger执行依赖
function trigger (target, key) {
  // 读取depsMap 其结构是 key => effects
  const depsMap = bucket.get(target)

  if (!depsMap) {
    return
  }
  // 真正读取依赖当前属性值key的effects
  const effects = depsMap.get(key)
  // 挨个执行即可
  effects && effects.forEach((fn) => fn())
}
// 统一对外暴露响应式函数
function reactive (state) {
  return new Proxy(state, {
    get (target, key) {
      const value = target[ key ]

      track(target, key)
      // console.log(`get ${key}: ${value}`)
      return value
    },
    set (target, key, newValue) {
      // console.log(`set ${key}: ${newValue}`)
      // 设置属性值
      target[ key ] = newValue

      trigger(target, key)
    }
  })
}

const state = reactive({
  foo: true,
  bar: true
})

effect(function effectFn1 () {
  console.log('effectFn1')

  effect(function effectFn2 () {
    console.log('effectFn2')
    console.log('Bar', state.bar)
  })
  
  console.log('Foo', state.foo)
})

setTimeout(() => {
  state.foo = false
}, 1000)