var builder = DistributedApplication.CreateBuilder(args);

var jwtSigningKey = builder.AddParameter("jwtsigningkey", secret: true);
var frontEndUrl = builder.AddParameter("frontendurl", secret: true);

var sql = builder.AddSqlServer("sql")
    .WithDataVolume("taskmanager-sqldata")
    .AddDatabase("taskdb");

var backend = builder.AddProject<Projects.TaskManager_Backend>("backend")
    .WithReference(sql)
    .WithEnvironment("JWT_SIGNING_KEY", jwtSigningKey)
    .WaitFor(sql);

if (builder.ExecutionContext.IsPublishMode)
{
    var frontend = builder.AddContainer("frontend", "taskmanager-frontend")
        .WithDockerfile("../taskmanager.frontend")
        .WithEndpoint(targetPort: 3000, scheme: "http", env: "PORT", isExternal: true)
        .WaitFor(backend)
        .WithEnvironment("NODE_ENV", "production")
        .WithEnvironment("BACKEND_URL", backend.GetEndpoint("http"));

    backend.WithEnvironment("WEB_APP_URI", frontEndUrl);
}
else
{
    var frontend = builder.AddJavaScriptApp("frontend", "../taskmanager.frontend")
        .WithNpm()
        .WithHttpEndpoint(env: "PORT")
        .WaitFor(backend)
        .WithEnvironment("BACKEND_URL", backend.GetEndpoint("http"));

    backend.WithEnvironment("WEB_APP_URI", frontend.GetEndpoint("http"));
}

backend.WithEnvironment("BACKEND_URI", backend.GetEndpoint("https"));

builder.Build().Run();
