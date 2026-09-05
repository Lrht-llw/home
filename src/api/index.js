// import axios from "axios";
import fetchJsonp from "fetch-jsonp";

/**
 * 音乐播放器
 */

// 本地网易云音乐 API 基础地址（api-enhanced-main）
const NETEASE_API = import.meta.env.VITE_SONG_API || "/netease";
const MAX_SONGS = 30;

// 请求并解析 JSON
const fetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`请求失败: ${url}`);
  return res.json();
};

// 根据播放类型获取网易云歌曲 ID 列表
const getNeteaseSongIds = async (type, id) => {
  if (type === "playlist") {
    const data = await fetchJson(`${NETEASE_API}/playlist/detail?id=${id}`);
    const tracks = data.playlist?.trackIds || data.playlist?.tracks || [];
    return tracks.map((t) => t.id);
  }
  if (type === "search") {
    const data = await fetchJson(
      `${NETEASE_API}/search?keywords=${encodeURIComponent(id)}&limit=${MAX_SONGS}`,
    );
    return (data.result?.songs || []).map((s) => s.id);
  }
  if (type === "album") {
    const data = await fetchJson(`${NETEASE_API}/album?id=${id}`);
    return (data.songs || []).map((s) => s.id);
  }
  if (type === "artist") {
    const data = await fetchJson(`${NETEASE_API}/artists?id=${id}`);
    return (data.hotSongs || []).map((s) => s.id);
  }
  if (type === "song") {
    return [id];
  }
  return [];
};

// 标准化歌词：部分歌曲歌词为纯文本（无时间轴）或带逐字后缀（如 [00:00.00-1]），统一为 APlayer 可解析的 LRC
const normalizeLrc = (lrc) => {
  if (!lrc) return "";
  // 去掉网易云逐字歌词的时间后缀，如 [00:00.00-1] -> [00:00.00]
  const normalized = lrc.replace(/\[(\d{2}:\d{2}(?:\.\d{2,3})?)-\d+\]/g, "[$1]");
  if (/\[\d{2}:\d{2}(?:\.\d{2,3})?\]/.test(normalized)) return normalized;
  // 纯文本歌词（无时间轴）：补递增时间标签，保证能显示
  const lines = normalized.split("\n").filter((line) => line.trim());
  return lines
    .map((line, i) => {
      const t = i * 4;
      const mm = String(Math.floor(t / 60)).padStart(2, "0");
      const ss = String(t % 60).padStart(2, "0");
      return `[${mm}:${ss}.00]${line}`;
    })
    .join("\n");
};

// 对接本地 api-enhanced（NeteaseCloudMusicApi）获取播放列表
const getNeteasePlayerList = async (type, id) => {
  const ids = (await getNeteaseSongIds(type, id)).slice(0, MAX_SONGS);
  if (!ids.length) return [];

  // 批量获取歌曲详情（名称/歌手/封面）
  const detail = await fetchJson(`${NETEASE_API}/song/detail?ids=${ids.join(",")}`);
  const songs = detail.songs || [];

  // 批量获取播放地址
  const urlData = await fetchJson(
    `${NETEASE_API}/song/url?id=${ids.join(",")}&br=320000`,
  );
  const urlMap = {};
  (urlData.data || []).forEach((u) => (urlMap[u.id] = u.url));

  // 逐首获取歌词
  const list = await Promise.all(
    songs.map(async (s) => {
      let lrc = "";
      try {
        const lyricData = await fetchJson(`${NETEASE_API}/lyric?id=${s.id}`);
        lrc = normalizeLrc(lyricData.lrc?.lyric || "");
      } catch {
        lrc = "";
      }
      return {
        name: s.name,
        artist: (s.ar || []).map((a) => a.name).join(" / "),
        url: urlMap[s.id] || "",
        cover: s.al?.picUrl || "",
        lrc,
      };
    }),
  );

  return list.filter((item) => item.url);
};

// 获取音乐播放列表
export const getPlayerList = async (server, type, id) => {
  // 网易云走本地 api-enhanced 接口
  if (server === "netease") {
    return getNeteasePlayerList(type, id);
  }

  // 其他音乐源（如 QQ 音乐）走 Meting 接口
  const res = await fetch(
    `${import.meta.env.VITE_SONG_API}?server=${server}&type=${type}&id=${id}`,
  );
  const data = await res.json();

  if (data[0].url.startsWith("@")) {
    // eslint-disable-next-line no-unused-vars
    const [handle, jsonpCallback, jsonpCallbackFunction, url] = data[0].url.split("@").slice(1);
    const jsonpData = await fetchJsonp(url).then((res) => res.json());
    const domain = (
      jsonpData.req_0.data.sip.find((i) => !i.startsWith("http://ws")) ||
      jsonpData.req_0.data.sip[0]
    ).replace("http://", "https://");

    return data.map((v, i) => ({
      name: v.name || v.title,
      artist: v.artist || v.author,
      url: domain + jsonpData.req_0.data.midurlinfo[i].purl,
      cover: v.cover || v.pic,
      lrc: v.lrc,
    }));
  } else {
    return data.map((v) => ({
      name: v.name || v.title,
      artist: v.artist || v.author,
      url: v.url,
      cover: v.cover || v.pic,
      lrc: v.lrc,
    }));
  }
};

/**
 * 一言
 */

// 获取一言数据
export const getHitokoto = async () => {
  const res = await fetch("https://v1.hitokoto.cn");
  return await res.json();
};

/**
 * 天气
 */

// 获取高德地理位置信息
export const getAdcode = async (key) => {
  const res = await fetch(`https://restapi.amap.com/v3/ip?key=${key}`);
  return await res.json();
};

// 获取高德地理天气信息
export const getWeather = async (key, city) => {
  const res = await fetch(
    `https://restapi.amap.com/v3/weather/weatherInfo?key=${key}&city=${city}`,
  );
  return await res.json();
};

// 高德逆地理编码（经纬度 -> adcode/城市名）
export const getRegeo = async (key, location) => {
  const res = await fetch(
    `https://restapi.amap.com/v3/geocode/regeo?key=${key}&location=${location}`,
  );
  return await res.json();
};

// 获取 wttr.in 天气 API（备用，无需 key；可传经纬度精确查询，否则按 IP 定位）
// https://github.com/chubin/wttr.in
export const getOtherWeather = async (location) => {
  const url = location
    ? `https://wttr.in/${location}?format=j1`
    : "https://wttr.in/?format=j1";
  const res = await fetch(url);
  return await res.json();
};
