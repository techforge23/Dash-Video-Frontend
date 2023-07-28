<template>
  <div id="container">
    <div id="titleDiv">
      <h1>Dash Video Gallery</h1>
    </div>
    <div id="videoListDiv">
      <div id="categoryDiv" class="bordered small-div">
        <h3>Categories</h3>
        <div v-if="categories.length === 0">
          <button @click="createCategory">Create Category</button>
        </div>
        <div v-else>
          <button @click="createCategory" class="category-button">Create</button>
          <button @click="deleteCategory" class="category-button">Delete</button>
          <ul>
            <li v-for="(category, index) in categories" :key="index" @click="selectCategory(index)" :class="{'selected-category': selectedCategory === index}">{{category}}</li>
          </ul>
        </div>
      </div>
      <div id="videoDiv" class="bordered large-div">
        <div id="videoTitleDiv">
          <h2>Uploaded Videos:</h2>
        </div>
        <ul>
          <li class="video-item" v-for="video in videos" :key="video.filename">
            <span @click="toggleVideoSelection(video)">{{video.filename}}</span>
            <input type="checkbox" :checked="video.isSelected" @change="toggleVideoSelection(video)">
            <button @click="removeVideo(video)" v-if="video.isSelected">Remove</button>
          </li>
        </ul>
      </div>
    </div>
    <div id="spacer"></div>
    <div id="uploadDiv">
      <form @submit.prevent="handleUpload">
        <input type="file" ref="fileInput" id="file" accept="video/*" hidden @change="handleFileSelection"/>
        <label for="file" class="upload-button">Choose File</label>
        <button type="submit" class="upload-button">Upload</button>
      </form>
    </div>
    <div v-if="uploadError" id="uploadError" class="error">
      <p class="alert-text">{{ uploadError }}</p>
    </div>
    <div id="selectedVideosDiv" v-if="selectedVideos.length > 0" class="bordered selected-videos">
      <h2>Selected Videos:</h2>
      <p>{{ selectedVideos.join(', ') }}</p>
    </div>
    <div id="prepareEmailDiv" v-if="!showEmailForm && selectedVideos.length > 0">
      <button @click="prepareEmail" class="prepareButton">Prepare Email</button>
    </div>
    <div id="emailFormDiv" v-if="showEmailForm" class="bordered email-form">
      <h2>Prepare Email:</h2>
      <label for="recipientEmail">Recipient:</label>
      <input type="email" id="recipientEmail" v-model="recipientEmail" required>
      <label for="emailSubject">Subject:</label>
      <input type="text" id="emailSubject" v-model="emailSubject" required>
      <label for="emailBody">Body:</label>
      <textarea id="emailBody" v-model="emailBody" required></textarea>
      <button @click="cancelEmail" class="cancelButton">Cancel</button>
      <button @click="sendEmail" class="sendButton">Send</button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'App',
  data() {
    return {
      videos: [],
      categories: [],
      selectedCategory: null,
      selectedVideos: [],
      selectedFile: null,
      uploadError: null,
      showEmailForm: false,
      recipientEmail: '',
      emailSubject: '',
      emailBody: ''
    };
  },
  methods: {
    handleFileSelection(event) {
      this.selectedFile = event.target.files[0];
    },
    async fetchVideos() {
      if (this.selectedCategory !== null) {
        try {
          const response = await axios.get(process.env.VUE_APP_API_URL + 'videos?category=' + this.categories[this.selectedCategory]);
          this.videos = response.data.videos.map(video => ({
            ...video,
            isSelected: this.selectedVideos.findIndex(v => v.filename === video.filename) > -1
          }));
        } catch (error) {
          console.log(error);
        }
      }
    },
    async fetchCategories() {
      try {
        const response = await axios.get(process.env.VUE_APP_API_URL + 'categories');
        this.categories = response.data.categories;
      } catch (error) {
        console.log(error);
      }
    },
    async handleUpload() {
      if (this.selectedCategory === null) {
        this.uploadError = "Please select a category before uploading.";
        return;
      }

      const formData = new FormData();
      formData.append('video', this.selectedFile);
      formData.append('category', this.categories[this.selectedCategory]);

      try {
        await axios.post(process.env.VUE_APP_API_URL + 'upload', formData);
        this.selectedFile = null;
        this.uploadError = null;
        await this.fetchVideos();
      } catch (error) {
        if (error.response && error.response.data && error.response.data.error) {
          this.uploadError = error.response.data.error;
        } else {
          this.uploadError = "An unexpected error occurred.";
        }
      }
    },
    async removeVideo(video) {
      try {
        await axios.delete(process.env.VUE_APP_API_URL + `video/${video.filename}`);
        await this.fetchVideos();
      } catch (error) {
        console.error(error);
      }
    },
    async createCategory() {
      let categoryName = window.prompt("Please enter the category name:");
      if (categoryName) {
        try {
          await axios.post(process.env.VUE_APP_API_URL + 'category', {category_name: categoryName});
          await this.fetchCategories();
        } catch (error) {
          console.error(error);
          alert("An error occurred");
        }
      } else {
        alert("Category name cannot be empty!");
      }
    },
    async deleteCategory() {
      let categoryName = window.prompt("Please enter the category name to delete:");
      if (categoryName) {
        try {
          await axios.delete(process.env.VUE_APP_API_URL + `category/${categoryName}`);
          await this.fetchCategories();
        } catch (error) {
          if (error.response && error.response.status === 404) {
            alert("Category does not exist!");
          } else {
            console.error(error);
            alert("An error occurred");
          }
        }
      } else {
        alert("Category name cannot be empty!");
      }
    },
    selectCategory(index) {
      this.selectedCategory = index;
      this.fetchVideos();
    },
    toggleVideoSelection(video) {
      video.isSelected = !video.isSelected;
      if(video.isSelected) {
        this.selectedVideos.push({filename: video.filename, url: video.url});
      } else {
        const index = this.selectedVideos.findIndex(v => v.filename === video.filename);
        if (index > -1) {
          this.selectedVideos.splice(index, 1);
        }
      }
    },
    prepareEmail() {
      this.showEmailForm = true;
    },
    cancelEmail() {
      this.showEmailForm = false;
      this.recipientEmail = '';
      this.emailSubject = '';
      this.emailBody = '';
    },
    async sendEmail() {
        if(!this.recipientEmail || !this.emailBody || this.selectedVideos.length === 0) {
            alert('All fields are required!');
            return;
        }
        try {
            await axios.post(process.env.VUE_APP_API_URL + 'sendEmail', {
                recipient: this.recipientEmail,
                subject: this.emailSubject,
                body: this.emailBody,
                videos: this.selectedVideos.map(video => video.filename)
            });
            alert('Email sent successfully!');
            this.cancelEmail();
            this.selectedVideos = [];
        } catch (error) {
            console.error(error);
            alert('An error occurred while sending the email');
        }
    },
  mounted() {
    this.fetchVideos();
    this.fetchCategories();
  }
};
</script>

<style scoped>
body, html {
  height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
}

#container {
  display: flex;
  flex-direction: column;
  border: 3px solid black;
  margin: 0;
  height: 100vh;
  background-color: grey;
  overflow: hidden;
}

#titleDiv {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 10%;
}

#videoListDiv {
  display: flex;
  justify-content: space-between;
  height: 45%;
  padding: 20px;
  background-color: white;
}

#categoryDiv, #videoDiv {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  border: 1px solid black;
  padding: 10px;
  margin-top: 20px;
  align-items: center;
}

#spacer {
  flex-grow: .15;
  background-color: white;
}

.small-div {
  width: 30%;
  height: 100%;
}

.large-div {
  width: 65%;
  height: 100%;
}

#uploadDiv, #sendDiv {
  display: flex;
  justify-content: center;
  align-items: center;
}

#uploadDiv {
  height: 10%;
}

#sendDiv {
  height: 10%;
  margin-top: 20px;
}

.category-button {
  margin-bottom: 5px;
  margin-right: 5px;
}

.bordered {
  margin-bottom: 5px;
  border: 1px solid black;
  padding: 10px;
}

.active {
  font-weight: bold;
  text-decoration: underline;
}

.button-wrapper {
  display: flex;
  justify-content: flex-start;
}

.action-button {
  margin-right: 5px;
}

.selected-category {
  font-weight: bold;
  text-decoration: underline;
}

* {
  box-sizing: border-box;
}

.upload-button, .sendButton {
  display: inline-block;
  padding: 10px 24px;
  margin-bottom: 0;
  font-size: 14px;
  color: #333;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  border: 1px solid transparent;
  border-radius: 4px;
  white-space: nowrap;
  background-color: #fff;
  text-decoration: none;
  margin-top: 45px;
}

.upload-button {
  margin-right: 10px;
}

.upload-button:hover, .sendButton:hover {
  background-color: #d3d3d3;
}

.alert-text {
  text-align: center;
}

.selected-videos {
  height: 150px;
  overflow-y: auto;
  background: white;
}

</style>





