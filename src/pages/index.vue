<template>

    <div class="hero bg-base-200 min-h-screen">
        <div class="hero-content text-center">
            <div class="max-w-md">
                <h1 class="text-5xl font-bold"> Welcome to Kiroku</h1>
                <p class="py-6">
                    An annotation app for object detection tasks.  
                </p>
                <router-link to="/projects" class="btn btn-primary btn-lg">
                    <ms-edit />
                    Start annotating
                </router-link>
            </div>
        </div>
    </div>

</template>
<script setup lang="ts">

</script>
