import React, { useState, useEffect } from "react";
import '@aws-amplify/ui-react/styles.css';
import "./App.css";
import { generateClient } from 'aws-amplify/api';
import { getCurrentUser } from 'aws-amplify/auth'
import {
  Button,
  Flex,
  Heading,
  Text,
  TextField,
  View,
  withAuthenticator,
} from "@aws-amplify/ui-react";
import { listNotes } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
} from "./graphql/mutations";

const API = generateClient();

const App = ({ signOut }) => {
  const [notes, setNotes] = useState([]);
  const [showUserPosts, setShowUserPosts] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  useEffect(() => {
    // Fetch all posts or user-specific posts based on the state
    showUserPosts ? fetchUserPosts() : fetchAllPosts();
  }, [showUserPosts]); // Re-run the effect when showUserPosts changes


  async function fetchAllPosts() {
    const apiData = await API.graphql({
      query: listNotes,
      variables: {
        sortDirection: 'DESC',
        sortBy: 'noteByDate',
      },
    });
    const notesFromAPI = apiData.data.listNotes.items;
    setNotes(notesFromAPI);
  }

  async function fetchUserPosts() {
    const { username } = await getCurrentUser();
    const apiData = await API.graphql({
      query: listNotes,
      variables: {
        filter: {
          user: { eq: username },
        },
        sortDirection: 'DESC',
        sortBy: 'noteByDate',
      },
    });
    const userPosts = apiData.data.listNotes.items;
    setNotes(userPosts);
  }

  async function fetchNotes() {
    const apiData = await API.graphql({
      query: listNotes
    });
    const notesFromAPI = apiData.data.listNotes.items;
    setNotes(notesFromAPI);
  }

  console.log( API.graphql({ query: listNotes }) );

  async function createNote(event) {
    event.preventDefault();
    const { username } = await getCurrentUser();
    const form = new FormData(event.target);
    const data = {
      name: form.get("name"),
      description: form.get("description"),
      time: form.get("time"),
      user: `${ username }`,
    };
    await API.graphql({
      query: createNoteMutation,
      variables: { input: data },
    });
    const newNote = {...data, id: form.get( "ID" )};
    setNotes([newNote,...notes]);
    event.target.reset();
    //fetchNotes();
    //event.target.reset();
  }

  async function deleteNote({ id }) {
    const newNotes = notes.filter((note) => note.id !== id);
    setNotes(newNotes);
    await API.graphql({
      query: deleteNoteMutation,
      variables: { input: { id } },
    });
  }

  return (
    <View className="App"  justifyContent="right" margin="1rem">
      <Heading level={1}>StudyHub</Heading>
        <Flex justifyContent="right">
          <Button onClick={signOut} variation = "quiet">Sign Out</Button>
        </Flex>
        <Flex justifyContent="right">
        <Button onClick={() => setShowUserPosts(!showUserPosts)}>
            {showUserPosts ? 'All Posts' : 'My Posts'}
          </Button>
        </Flex>

      <View as="form" margin="3rem 0" onSubmit={createNote}>
        <Flex direction="row" justifyContent="center">
          <TextField
            name="name"
            placeholder="class/subject"
            label="Note Name"
            labelHidden
            variation="quiet"
            required
          />
          <TextField
            name = "time"
            placeholder = "Desired Time"
            label = "Desired Time"
            labelHidden
          />
          <Button type="submit" variation="primary">
            Create Post
          </Button>
        </Flex>
        <Flex direction = "column" justifyContent="center">
        <TextField
            name="description"
            placeholder="Note Description"
            label="Note Description"
            labelHidden
            variation="quiet"
            required
          />
        </Flex>
      </View>
      <Heading level={2}>Study Group Posts</Heading>
      <View margin="3rem 0">
        {notes.map((note) => (
          <View
            key={note.id || note.name}
            borderWidth="thick"
            borderColor="dark"
            borderRadius="regular"
            padding="1rem"
            marginBottom="1rem"
          >
              <Text as="div" fontWeight={700}>
                Subject: {note.name}
              </Text>
              <Text as="div">Preferred time: {note.time}</Text>
            <Text as="div">Username: {note.user}</Text>
            <Text as="div" overflow="auto" maxHeight="100px">
              {note.description}
            </Text>
            {showUserPosts && (
            <Button onClick={() => deleteNote(note)}>
              Delete Post
            </Button>
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

export default withAuthenticator(App);