FROM docker.io/library/node:12

RUN useradd --create-home rhythmbot
WORKDIR /home/rhythmbot

COPY package.json/ ./
COPY ffmpeg.exe/ ./
COPY ffplay.exe/ ./
COPY ffprobe.exe/ ./
COPY data/rhythm.db/ ./data/
COPY .env/ ./
COPY tsconfig.json/ ./
COPY src/ ./src
COPY helptext.txt ./
COPY LICENSE ./
COPY README.md ./

RUN npm install
RUN npm run build
RUN chown -R rhythmbot /home/rhythmbot
USER rhythmbot
VOLUME /home/rhythmbot/data

CMD npm run start:prod
# HEALTHCHECK CMD
