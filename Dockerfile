# 使用 Node.js 作為基礎映像
FROM node:22.15.0-alpine

# 設置工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json 以安裝依賴
COPY package*.json ./

# 安裝依賴
RUN npm install

# 複製專案所有文件到容器內
COPY . .

# 創建一個持久化資料夾（Docker Volume 掛載點）
VOLUME ["/app/data"]

# 啟動機器人
CMD ["node", "deploy-commands.js"]