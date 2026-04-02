# AI 初创公司增长榜单

## 本地运行

```bash
cd /Users/calmfish/dev/projects/初创公司列表
npx tsx scripts/bootstrap.ts
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)。

## 真实数据抓取

```bash
cd /Users/calmfish/dev/projects/初创公司列表
TRUSTMRR_API_KEY=your-key HTTPS_PROXY=http://127.0.0.1:7890 npx tsx scripts/fetch-daily-snapshot.ts
```

## 服务器安全配置

原则：

- `Clash` 的上游节点配置只放在服务器上
- 网站项目只读取服务器本机代理端口
- 不把代理节点地址、密码、订阅信息写进代码仓库

推荐方式：

1. 在服务器安装 `Clash` 或 `Clash Meta`
2. 将节点配置保存在服务器，例如 `/etc/clash/config.yaml`
3. 让 Clash 监听服务器本地端口，例如 `127.0.0.1:7890`
4. 项目进程只设置：

```bash
TRUSTMRR_API_KEY=your-key
HTTPS_PROXY=http://127.0.0.1:7890
```

## 服务器环境变量示例

```bash
TRUSTMRR_API_KEY=your-key
DATABASE_PATH=/srv/ai-startups-list/data/leaderboard.sqlite
TRUSTMRR_BASE_URL=https://trustmrr.com/api/v1
HTTPS_PROXY=http://127.0.0.1:7890
```

## systemd 示例

`/etc/systemd/system/ai-startups-list.service`

```ini
[Unit]
Description=AI Startups Leaderboard
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/ai-startups-list
Environment=NODE_ENV=production
Environment=TRUSTMRR_API_KEY=replace-me
Environment=DATABASE_PATH=/srv/ai-startups-list/data/leaderboard.sqlite
Environment=TRUSTMRR_BASE_URL=https://trustmrr.com/api/v1
Environment=HTTPS_PROXY=http://127.0.0.1:7890
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=3
User=www-data

[Install]
WantedBy=multi-user.target
```

## Clash systemd 示例

`/etc/systemd/system/clash.service`

```ini
[Unit]
Description=Clash
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/clash -d /etc/clash
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
```

## 每日抓取 cron 示例

```bash
0 8 * * * cd /srv/ai-startups-list && /usr/bin/env bash -lc 'TRUSTMRR_API_KEY=replace-me DATABASE_PATH=/srv/ai-startups-list/data/leaderboard.sqlite TRUSTMRR_BASE_URL=https://trustmrr.com/api/v1 HTTPS_PROXY=http://127.0.0.1:7890 npx tsx scripts/fetch-daily-snapshot.ts >> /var/log/ai-startups-snapshot.log 2>&1'
```

## 部署顺序

```bash
cd /srv/ai-startups-list
npm install
npx tsx scripts/bootstrap.ts
npm run build
sudo systemctl enable --now clash
sudo systemctl enable --now ai-startups-list
```
