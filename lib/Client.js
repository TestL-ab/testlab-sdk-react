import axios from "axios";
import { isEnabled, getVariant } from "./assignmentLogic.js";
import { v4 as uuid } from "uuid";

class Client {
  constructor(config) {
    this.config = config;
    this.context = undefined;
    this.experiments = {};
  }

  // UserID and IP are automatically populated in context when client is initialized
  async addDefaultContext() {
    let ipObj = await this.getIp();
    let ip = ipObj.ip;
    this.context = { userID: uuid(), ip: ip };
  }

  updateContext(contextObj) {
    if (!contextObj || !contextObj.userID || !contextObj.ip) {
      console.log("Context object must contain both a userID and ip property.");
    } else {
      this.context = contextObj;
    }
    console.log("context", this.context);
  }

  async getIp() {
    const response = await axios.get("https://ipapi.co/json/");
    return response.data;
  }

  getFeatureValue(name) {
    let experiment = this.experiments.filter((exp) => exp.name === name)[0];

    if (experiment.type_id !== 3) {
      return isEnabled(this.experiments, name, this.context.userID);
    } else {
      let enabled = isEnabled(this.experiments, name, this.context.userID);
      let variant = getVariant(this.experiments, name, this.context.userID);
      //let users = await this.getUsers();
      this.getUsers()
        .then((users) => {
          let existingUser = users.filter(
            (user) =>
              user.id === this.context.userID && user.variant_id === variant.id
          )[0];
          if (enabled && variant && !existingUser) {
            this.createUser({
              id: this.context.userID,
              variant_id: variant.id,
              ip_address: this.context.ip,
            });
          }
        })
        .catch((error) =>
          console.log("Unable to retrieve existing users", error)
        );

      return enabled && variant;
    }
  }

  async getExperiments() {
    let experiments;
    try {
      experiments = await axios.get(
        `${this.config.serverAddress}/api/experiment`
      );
      this.experiments = experiments.data;
    } catch (error) {
      console.log("Error fetching experiments", error);
    }
  }

  async fetchExperiments() {
    let experiments;
    const lastModified = new Date(Date.now() - this.config.interval);
    try {
      const config = {
        headers: {
          "If-Modified-Since": lastModified.toUTCString(),
        },
      };
      experiments = await axios.get(
        `${this.config.serverAddress}/api/experiment`,
        config
      );
      if (experiments.status === 304) {
        return this.experiments;
      }
      return (this.experiments = experiments.data);
    } catch (error) {
      console.log("Error fetching experiments:", error);
    }
  }

  async getUsers() {
    try {
      let users = await axios.get(`${this.config.serverAddress}/api/users`);
      return users.data;
    } catch (error) {
      console.log("Error fetching users:", error);
    }
  }

  async createUser({ id, variant_id, ip_address }) {
    try {
      const response = await axios.post(
        `${this.config.serverAddress}/api/users`,
        {
          id,
          variant_id,
          ip_address,
        }
      );
      return response.data;
    } catch (error) {
      console.log("error creating user", error);
      return error.data;
    }
  }

  async createEvent({ variant_id, user_id }) {
    try {
      const response = await axios.post(
        `${this.config.serverAddress}/api/events`,
        {
          variant_id,
          user_id,
        }
      );
      return response.data;
    } catch (error) {
      return error.data;
    }
  }
}

export default Client;
