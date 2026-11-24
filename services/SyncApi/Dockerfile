# Build context: services/SyncApi
#   docker build -t tjuvstart-sync services/SyncApi

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY Directory.Build.props .editorconfig ./
COPY src/Tjuvstart.SyncApi/Tjuvstart.SyncApi.csproj src/Tjuvstart.SyncApi/
RUN dotnet restore src/Tjuvstart.SyncApi/Tjuvstart.SyncApi.csproj
COPY src/ src/
RUN dotnet publish src/Tjuvstart.SyncApi/Tjuvstart.SyncApi.csproj -c Release -o /app --no-restore

# Chiseled image: no shell or package manager, runs as a non-root user.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_HTTP_PORTS=8080 \
    # Hosting platforms terminate TLS in front of the container. Trust their X-Forwarded-*
    # headers so rate limiting sees the client's address and redirects use https.
    ASPNETCORE_FORWARDEDHEADERS_ENABLED=true
EXPOSE 8080
ENTRYPOINT ["dotnet", "Tjuvstart.SyncApi.dll"]
