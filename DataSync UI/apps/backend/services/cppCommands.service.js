import { spawn } from "child_process";
import fs from "fs";
import path from "path";

// Dev: fixed path to DataSync repo. Override with DATASYNC_PATH / DATASYNC_CWD env.
const DataSyncPath = process.env.DATASYNC_PATH || "/home/iks/Documents/DataSync/DataSync";
const DataSyncCwd = process.env.DATASYNC_CWD || "/home/iks/Documents/DataSync";

async function executeSecurityCommand(operation, requestData) {
  const { spawn } = await import("child_process");
  
  if (!fs.existsSync(DataSyncPath)) {
    throw new Error(`DataSync executable not found at: ${DataSyncPath}`);
  }

  const requestJson = JSON.stringify({ operation, ...requestData });
  
  const cppProcess = spawn(DataSyncPath, ["--security"], {
    cwd: DataSyncCwd,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  cppProcess.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  cppProcess.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  cppProcess.stdin.write(requestJson);
  cppProcess.stdin.end();

  return new Promise((resolve, reject) => {
    cppProcess.on("error", (err) => {
      reject(new Error(`Failed to start DataSync process: ${err.message}`));
    });

    cppProcess.on("close", (code) => {
      if (code === 0) {
        try {
          const output = JSON.parse(stdout);
          if (output.success) {
            resolve(output);
          } else {
            reject(new Error(output.error || "Command failed"));
          }
        } catch (parseErr) {
          reject(new Error(`Failed to parse output: ${parseErr.message}. Output: ${stdout}`));
        }
      } else {
        reject(new Error(`Process exited with code ${code}. Stderr: ${stderr || stdout}`));
      }
    });
  });
}

async function executeCatalogCommand(operation, requestData) {
  const { spawn } = await import("child_process");
  
  if (!fs.existsSync(DataSyncPath)) {
    throw new Error(`DataSync executable not found at: ${DataSyncPath}`);
  }

  const requestJson = JSON.stringify({ operation, ...requestData });
  
  const cppProcess = spawn(DataSyncPath, ["--catalog"], {
    cwd: DataSyncCwd,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  cppProcess.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  cppProcess.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  cppProcess.stdin.write(requestJson);
  cppProcess.stdin.end();

  return new Promise((resolve, reject) => {
    cppProcess.on("error", (err) => {
      reject(new Error(`Failed to start DataSync process: ${err.message}`));
    });

    cppProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`DataSync process exited with code ${code}. stderr: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse DataSync output: ${parseError.message}. stdout: ${stdout}`));
      }
    });
  });
}

async function executeMaintenanceCommand(operation, requestData) {
  const { spawn } = await import("child_process");
  
  if (!fs.existsSync(DataSyncPath)) {
    throw new Error(`DataSync executable not found at: ${DataSyncPath}`);
  }

  const requestJson = JSON.stringify({ operation, ...requestData });
  
  const cppProcess = spawn(DataSyncPath, ["--maintenance"], {
    cwd: DataSyncCwd,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  cppProcess.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  cppProcess.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  cppProcess.stdin.write(requestJson);
  cppProcess.stdin.end();

  return new Promise((resolve, reject) => {
    cppProcess.on("error", (err) => {
      reject(new Error(`Failed to start DataSync process: ${err.message}`));
    });

    cppProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`DataSync process exited with code ${code}. stderr: ${stderr}`));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (parseError) {
        reject(new Error(`Failed to parse DataSync output: ${parseError.message}. stdout: ${stdout}`));
      }
    });
  });
}

async function executeMonitoringCommand(operation, requestData) {
  const { spawn } = await import("child_process");
  
  if (!fs.existsSync(DataSyncPath)) {
    throw new Error(`DataSync executable not found at: ${DataSyncPath}`);
  }

  const requestJson = JSON.stringify({ operation, ...requestData });
  
  const cppProcess = spawn(DataSyncPath, ["--monitoring"], {
    cwd: DataSyncCwd,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";

  cppProcess.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  cppProcess.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  cppProcess.stdin.write(requestJson);
  cppProcess.stdin.end();

  return new Promise((resolve, reject) => {
    cppProcess.on("error", (err) => {
      reject(new Error(`Failed to start DataSync process: ${err.message}`));
    });

    cppProcess.on("close", (code) => {
      // When exit code is non-zero (e.g. ASan leak report or C++ exception writing to stderr),
      // the process may have written valid JSON to stdout or stderr. Parse so we don't turn
      // a logical success/failure into a 500.
      const toParse = stdout.trim() || (code !== 0 ? stderr.trim() : "");
      let output;
      try {
        output = toParse ? JSON.parse(toParse) : null;
      } catch (parseErr) {
        if (code === 0) {
          reject(new Error(`Failed to parse output: ${parseErr.message}. Output: ${stdout}`));
        } else {
          reject(new Error(`Process exited with code ${code}. Stderr: ${stderr || stdout}`));
        }
        return;
      }
      if (output && typeof output.success === "boolean") {
        if (output.success) {
          resolve(output);
        } else {
          reject(new Error(output.error || "Command failed"));
        }
      } else if (code !== 0) {
        reject(new Error(`Process exited with code ${code}. Stderr: ${stderr || stdout}`));
      } else {
        reject(new Error(`Failed to parse output. Output: ${stdout}`));
      }
    });
  });
}

export {
  executeSecurityCommand,
  executeCatalogCommand,
  executeMaintenanceCommand,
  executeMonitoringCommand,
  DataSyncPath,
};
