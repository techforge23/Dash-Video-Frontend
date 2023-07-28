<template>
  <div class="app">
    <div class="categories">
      <button class="create-category-button" @click="createCategory">Create Category</button>
      <button class="delete-category-button" @click="deleteCategory">Delete Category</button>
      <div class="category-list">
        <div
          v-for="(category, index) in categories"
          :key="index"
          class="category-item"
          :class="{active: selectedCategory === index}"
          @click="selectCategory(index)"
        >
          {{ category }}
        </div>
      </div>
    </div>
    <div class="videos">
      <div class="video-list">
        <div
          v-for="video in videos"
          :key="video.filename"
          class="video-item"
          @click="toggleVideoSelection(video)"
          :class="{active: isSelected(video)}"
        >
          {{ video.filename }}
        </div>
      </div>
      <div class="upload">
        <input type="file" @change="handleFileSelection">
        <button @click="handleUpload">Upload</button>
        <div class="upload-error" v-if="uploadError">{{ uploadError }}</div>
      </div>
    </div>
    <div class="selected-videos">
      <h3>Selected Videos</h3>
      <p>{{ selectedVideos.map(video => video.filename).join(', ') }}</p>
    </div>
    <div class="email-container">
      <div class="button-wrapper" v-if="!showEmailForm">
        <button @click="prepareEmail">Prepare Email</button>
      </div>
      <div class="email-form" v-else>
        <div class="email-field">
          <label for="recipientEmail">Recipient Email:</label>
          <input id="recipientEmail" type="text" v-model="recipientEmail" placeholder="Recipient Email">
        </div>
        <div class="email-field">
          <label for="emailSubject">Subject:</label>
          <input id="emailSubject" type="text" v-model="emailSubject" placeholder="Subject">
        </div>
        <div class="email-field">
          <label for="emailBody">Email Body:</label>
          <textarea id="emailBody" v-model="emailBody" placeholder="Email Body"></textarea>
        </div>
        <div class="button-wrapper">
          <button @click="sendEmail">Send</button>
          <button @click="cancelEmail">Cancel</button>
        </div>
      </div>
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
      const foundIndex = this.selectedVideos.findIndex(v => v.filename === video.filename);
      if (foundIndex > -1) {
        this.selectedVideos.splice(foundIndex, 1);
      } else {
        this.selectedVideos.push({filename: video.filename, url: video.url});
      }
    },
    isSelected(video) {
      return this.selectedVideos.findIndex(v => v.filename === video.filename) > -1;
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
        let emailContent = this.emailBody;

        await axios.post(process.env.VUE_APP_API_URL + 'sendEmail', {
            recipient: this.recipientEmail,
            subject: this.emailSubject,
            body: emailContent,
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

.app {
  display: flex;
  flex-direction: column;
  border: 3px solid black;
  margin: 0;
  height: 100vh;
  background-color: grey;
  overflow: hidden;
}

.categories {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.create-category-button,
.delete-category-button {
  margin-bottom: 10px;
}

.category-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.category-item {
  cursor: pointer;
  padding: 10px;
}

.category-item.active {
  font-weight: bold;
  text-decoration: underline;
}

.videos {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.video-list {
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.video-item {
  cursor: pointer;
  padding: 10px;
}

.video-item.active {
  font-weight: bold;
  text-decoration: underline;
}

.upload {
  margin-top: 20px;
}

.upload-error {
  color: red;
}

.selected-videos {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.email-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.button-wrapper {
  margin-top: 20px;
}

.email-form {
  display: flex;
  flex-direction: column;
}

.email-field {
  margin-bottom: 10px;
}
</style>






