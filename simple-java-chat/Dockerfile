FROM eclipse-temurin:21-jdk-jammy

WORKDIR /app

COPY Main.java index.html style.css script.js favicon.svg ./

RUN javac Main.java

ENV PORT=10000

EXPOSE 10000

CMD ["java", "Main"]