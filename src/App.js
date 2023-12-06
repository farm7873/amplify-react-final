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
import { listNotes , listReplies } from "./graphql/queries";
import {
  createNote as createNoteMutation,
  deleteNote as deleteNoteMutation,
  createReply as createReplyMutation
} from "./graphql/mutations";


const API = generateClient();

const App = ({ signOut }) => {
  const [notes, setNotes] = useState([]);
  const [showUserPosts, setShowUserPosts] = useState(false);
  const [selectedPost , setSelectedPost] = useState( null );

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
      {selectedPost ? (
        <PostDetails selectedPost={selectedPost} onBack={() => setSelectedPost(null)} />
      ) : (
        <>
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
      
        {!showUserPosts && (
          <Heading level={2}>
          Study Group Posts
          </Heading>
        )}
        {showUserPosts && (
          <Heading level={2}>
          My Posts
          </Heading>
        )}

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
            <Text as="div">Preferred Time: {note.time}</Text>
            <Text as="div">Username: {note.user}</Text>
            <Text as="div" overflow="auto" maxHeight="100px">
              {note.description}
            </Text>
            <Button onClick={() => setSelectedPost(note)}>
              View Details
            </Button>
            {showUserPosts && (
            <Button onClick={() => deleteNote(note)}>
              Delete Post
            </Button>
            )}
          </View>
        ))}
      </View>
      </>
      )}
    </View>
  );
};

const PostDetails = ({ selectedPost, onBack }) => {
  const [replies, setReplies] = useState([]);
  const [replyContent , setReplyContent] = useState('');
  
  useEffect(() => {
    fetchReplies(); // Initial fetch
  }, [selectedPost]);

  const fetchReplies = async () => {
    try {
      const replyData = await API.graphql({
        query: listReplies,
        variables: {
          filter: {
            postID: { eq: selectedPost.id },
          },
        },
      });
      setReplies(replyData.data.listReplies.items);
    } catch (error) {
      console.error('Error fetching replies:', error);
    }
  };

  // const postReply = async () => {
  //   const { username } = await getCurrentUser();
  //   try {
  //     await API.graphql({
  //       query: createReplyMutation,
  //       variables: {
  //         input: {
  //           content: replyContent,
  //           postID: selectedPost.id,
  //           replyingUser: `${ username }`,
  //         },
  //       },
  //     });
  //     // Refetch replies to update the list
  //     await fetchReplies();
  //     // Clear the reply content after posting
  //     setReplyContent('');
  //   } catch (error) {
  //     console.error('Error posting reply:', error);
  //   }
  // };

  async function createReply(event) {
    event.preventDefault();
    const { username } = await getCurrentUser();
    const form = new FormData(event.target);
    const data = {
      replyingUser: `${ username }`,
      content: form.get("description"),
      postID: selectedPost.id,
    };
    await API.graphql({
      query: createReplyMutation,
      variables: { input: data },
    });
    const newReply = {...data, id: form.get( "ID" )};
    setReplies([replies,...newReply]);
    event.target.reset();
    //fetchNotes();
    //event.target.reset();
  }


  return (
    <div>
      <h1>Post Details</h1>
      {/* Display selected post details */}
      {selectedPost && (
        <>
          <p>Subject: {selectedPost.name}</p>
          <p>Preferred Time: {selectedPost.time}</p>
          <p>Username: {selectedPost.user}</p>
          <p>{selectedPost.description}</p>
          <p></p>
        </>
      )}
      <div>
        <h2>Replies:</h2>
        {replies.map((reply) => (
          <div key={reply.id}>
            <p>User: {reply.replyingUser}</p>
            <p>At {reply.createdAt}</p>
            <p>Replied: {reply.content}</p>
          </div>
        ))}
      </div>
      <div>
      <View as="form" margin="3rem 0" onSubmit={createReply}>
        <Flex direction="row" justifyContent="center">
          <Button type="submit" variation="primary">
            Create Post
          </Button>
        </Flex>
        <Flex direction = "column" justifyContent="center">
        <TextField
            name="description"
            placeholder="Type your reply"
            label="Note Description"
            labelHidden
            variation="quiet"
            required
          />
        </Flex>
      </View>
      </div>
      {/* Back Button */}
      <Button onClick={onBack}>Back to All Posts</Button>
    </div>
  );
};

export default withAuthenticator(App);