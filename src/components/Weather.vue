<template>
  <div class="weather" v-if="weatherData.adCode.city && weatherData.weather.weather">
    <span>{{ weatherData.adCode.city }}&nbsp;</span>
    <span>{{ weatherData.weather.weather }}&nbsp;</span>
    <span>{{ weatherData.weather.temperature }}℃</span>
    <span class="sm-hidden">
      &nbsp;{{
        weatherData.weather.winddirection?.endsWith("风")
          ? weatherData.weather.winddirection
          : weatherData.weather.winddirection + "风"
      }}&nbsp;
    </span>
    <span class="sm-hidden">{{ weatherData.weather.windpower }}&nbsp;级</span>
  </div>
  <div class="weather" v-else>
    <span>天气数据获取失败</span>
  </div>
</template>

<script setup>
import { getAdcode, getWeather, getOtherWeather } from "@/api";
import { Error } from "@icon-park/vue-next";

// 高德开发者 Key
const mainKey = import.meta.env.VITE_WEATHER_KEY;

// 天气数据
const weatherData = reactive({
  adCode: {
    city: null, // 城市
    adcode: null, // 城市编码
  },
  weather: {
    weather: null, // 天气现象
    temperature: null, // 实时气温
    winddirection: null, // 风向描述
    windpower: null, // 风力级别
  },
});

// 天气现象（按 wttr.in 的 weatherCode 映射为中文）
const weatherCodeMap = {
  "113": "晴",
  "116": "多云",
  "119": "阴",
  "122": "阴",
  "143": "雾",
  "176": "阵雨",
  "179": "阵雪",
  "182": "雨夹雪",
  "200": "雷阵雨",
  "248": "雾",
  "260": "冻雾",
  "263": "毛毛雨",
  "266": "小雨",
  "281": "冻毛毛雨",
  "293": "阵雨",
  "296": "小雨",
  "299": "中雨",
  "302": "中雨",
  "305": "大雨",
  "308": "大雨",
  "311": "冻雨",
  "314": "强冻雨",
  "317": "雨夹雪",
  "320": "雨夹雪",
  "323": "小雪",
  "326": "小雪",
  "329": "中雪",
  "332": "中雪",
  "335": "大雪",
  "338": "大雪",
  "350": "冰粒",
  "353": "阵雨",
  "356": "强阵雨",
  "359": "暴雨",
  "362": "阵性雨夹雪",
  "365": "强阵性雨夹雪",
  "368": "阵雪",
  "371": "强阵雪",
  "374": "冰粒阵雨",
  "377": "强冰粒阵雨",
  "386": "雷阵雨",
  "389": "强雷阵雨",
  "392": "雷阵雪",
  "395": "强雷阵雪",
};

// 风向 16 方位转中文
const windDirMap = {
  N: "北",
  NNE: "东北偏北",
  NE: "东北",
  ENE: "东北偏东",
  E: "东",
  ESE: "东南偏东",
  SE: "东南",
  SSE: "东南偏南",
  S: "南",
  SSW: "西南偏南",
  SW: "西南",
  WSW: "西南偏西",
  W: "西",
  WNW: "西北偏西",
  NW: "西北",
  NNW: "西北偏北",
};

// 风速(km/h)换算为蒲福风力等级
const getWindPower = (kmh) => {
  const speed = Number(kmh);
  if (speed < 1) return "0";
  if (speed <= 5) return "1";
  if (speed <= 11) return "2";
  if (speed <= 19) return "3";
  if (speed <= 28) return "4";
  if (speed <= 38) return "5";
  if (speed <= 49) return "6";
  if (speed <= 61) return "7";
  if (speed <= 74) return "8";
  if (speed <= 88) return "9";
  if (speed <= 102) return "10";
  if (speed <= 117) return "11";
  return "12";
};

// 获取天气数据
const getWeatherData = async () => {
  try {
    // 获取地理位置信息
    if (!mainKey) {
      console.log("未配置，使用备用天气接口");
      const result = await getOtherWeather();
      console.log(result);
      const condition = result.current_condition?.[0] ?? {};
      const area =
        result.nearest_area?.[0]?.areaName?.[0]?.value || "未知地区";
      weatherData.adCode = {
        city: area,
      };
      weatherData.weather = {
        weather:
          weatherCodeMap[condition.weatherCode] ||
          condition.weatherDesc?.[0]?.value ||
          "未知",
        temperature: condition.temp_C,
        winddirection:
          windDirMap[condition.winddir16Point] || condition.winddir16Point,
        windpower: getWindPower(condition.windspeedKmph),
      };
    } else {
      // 获取 Adcode
      const adCode = await getAdcode(mainKey);
      console.log(adCode);
      if (adCode.infocode !== "10000") {
        throw "地区查询失败";
      }
      weatherData.adCode = {
        city: adCode.city,
        adcode: adCode.adcode,
      };
      // 获取天气信息
      const result = await getWeather(mainKey, weatherData.adCode.adcode);
      weatherData.weather = {
        weather: result.lives[0].weather,
        temperature: result.lives[0].temperature,
        winddirection: result.lives[0].winddirection,
        windpower: result.lives[0].windpower,
      };
    }
  } catch (error) {
    console.error("天气信息获取失败:" + error);
    onError("天气信息获取失败");
  }
};

// 报错信息
const onError = (message) => {
  ElMessage({
    message,
    icon: h(Error, {
      theme: "filled",
      fill: "#efefef",
    }),
  });
  console.error(message);
};

onMounted(() => {
  // 调用获取天气
  getWeatherData();
});
</script>
