var builder = DistributedApplication.CreateBuilder(args);

var jwtSigningKey = builder.AddParameter("jwt-signing-key", secret: true);

var sql = builder.AddSqlServer("sql")
    .WithDataVolume("taskmanager-sqldata")
    .AddDatabase("taskdb");

var backend = builder.AddProject<Projects.TaskManager_Backend>("backend")
    .WithReference(sql)
    .WaitFor(sql)
    .WithEnvironment("JWT_SIGNING_KEY", jwtSigningKey);

var frontend = builder.AddJavaScriptApp("frontend", "../taskmanager.frontend")
    .WithNpm()
    .WithHttpEndpoint(env: "PORT")
    .WithEnvironment("BACKEND_URL", backend.GetEndpoint("http"));

backend.WithEnvironment("WEB_APP_URI", frontend.GetEndpoint("http"));
backend.WithEnvironment("BACKEND_URI", backend.GetEndpoint("https"));

builder.Build().Run();
